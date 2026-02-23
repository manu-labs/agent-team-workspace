"""Generic fallback integration for platforms without specific support.

Attempts to find and fill common registration form patterns. If no
automatable form is found, returns manual_required with the RSVP URL
so the user can register themselves.
"""

import logging
import tempfile
from pathlib import Path

from app.services.integrations.base import BaseIntegration, RSVPResult

logger = logging.getLogger(__name__)


class GenericIntegration(BaseIntegration):
    """Fallback integration that handles any URL not claimed by a specific integration."""

    async def can_handle(self, url: str) -> bool:
        # The generic integration is always a fallback — never claim URLs here.
        # The registry uses it explicitly when no other integration matches.
        return False

    async def rsvp(
        self,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return RSVPResult(
                success=False,
                status="manual_required",
                message=f"No integration available for this URL. Register manually: {url}",
                confirmation_url=url,
            )

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            )
            page = await context.new_page()
            try:
                return await self._try_generic_form(page, url, user_email, user_first_name, user_last_name)
            except Exception as exc:
                screenshot_path = await self._save_screenshot(page, url)
                logger.info("Generic integration could not automate %s: %s (screenshot: %s)", url, exc, screenshot_path)
                return RSVPResult(
                    success=False,
                    status="manual_required",
                    message=f"Could not automate registration. Register manually: {url}",
                    confirmation_url=url,
                )
            finally:
                await browser.close()

    async def _try_generic_form(self, page, url: str, email: str, first: str, last: str) -> RSVPResult:
        await page.goto(url, wait_until="networkidle", timeout=30_000)

        # Look for any email input — if present, try to fill a basic registration form
        email_field = page.locator("input[type=email], input[name*=email]")
        if await email_field.count() == 0:
            return RSVPResult(
                success=False,
                status="manual_required",
                message=f"No registration form detected. Register manually: {url}",
                confirmation_url=url,
            )

        # CAPTCHA check
        if await page.locator("iframe[src*='recaptcha'], iframe[src*='hcaptcha']").count():
            return RSVPResult(
                success=False,
                status="manual_required",
                message=f"CAPTCHA detected -- register manually: {url}",
                confirmation_url=url,
            )

        # Fill whatever fields we can find
        full_name = f"{first} {last}".strip()
        for selector in ["input[name*=name]", "input[placeholder*=Name]", "input[placeholder*=name]"]:
            loc = page.locator(selector)
            if await loc.count() > 0:
                await loc.first.fill(full_name)
                break

        for selector in ["input[name*=first]", "input[placeholder*=First]"]:
            loc = page.locator(selector)
            if await loc.count() > 0:
                await loc.first.fill(first)
                break

        for selector in ["input[name*=last]", "input[placeholder*=Last]"]:
            loc = page.locator(selector)
            if await loc.count() > 0:
                await loc.first.fill(last)
                break

        await email_field.first.fill(email)

        # Try to submit
        submit = page.locator("button[type=submit], input[type=submit]")
        if await submit.count() == 0:
            return RSVPResult(
                success=False,
                status="manual_required",
                message=f"Found form but no submit button. Register manually: {url}",
                confirmation_url=url,
            )

        await submit.first.click()
        await page.wait_for_timeout(3_000)

        result_text = (await page.inner_text("body")).lower()
        if any(p in result_text for p in ("thank you", "confirmed", "registered", "success")):
            return RSVPResult(success=True, status="success", message=f"Registered via generic form: {url}", confirmation_url=url)

        return RSVPResult(
            success=False,
            status="manual_required",
            message=f"Form submitted but outcome unclear. Verify registration at: {url}",
            confirmation_url=url,
        )

    @staticmethod
    async def _save_screenshot(page, url: str) -> str:
        try:
            slug = url.split("//", 1)[-1].replace("/", "_")[:60]
            path = Path(tempfile.gettempdir()) / f"generic_fail_{slug}.png"
            await page.screenshot(path=str(path), full_page=True)
            return str(path)
        except Exception:
            return "screenshot unavailable"

    async def check_availability(self, url: str) -> bool:
        return True