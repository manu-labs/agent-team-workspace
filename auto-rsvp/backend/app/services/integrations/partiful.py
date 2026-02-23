"""Partiful RSVP integration via Playwright browser automation.

Partiful has no public API. This integration navigates to the event page
and fills the RSVP form with the user's name and email.
"""

import logging
import tempfile
from pathlib import Path

from app.services.integrations.base import BaseIntegration, RSVPResult

logger = logging.getLogger(__name__)


class PartifulIntegration(BaseIntegration):
    async def can_handle(self, url: str) -> bool:
        return "partiful.com" in url.lower()

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
                status="failed",
                message="Playwright is not installed. Run: playwright install chromium",
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
                return await self._do_rsvp(page, url, user_email, user_first_name, user_last_name)
            except Exception as exc:
                screenshot_path = await self._save_screenshot(page, url)
                logger.error("Partiful RSVP failed for %s: %s (screenshot: %s)", url, exc, screenshot_path)
                return RSVPResult(success=False, status="failed", message=f"Partiful automation error: {exc}")
            finally:
                await browser.close()

    async def _do_rsvp(self, page, url: str, email: str, first: str, last: str) -> RSVPResult:
        await page.goto(url, wait_until="networkidle", timeout=30_000)

        page_text = (await page.inner_text("body")).lower()

        # Check for sold-out / closed states
        if any(p in page_text for p in ("sold out", "rsvps are closed", "event is full", "no longer accepting")):
            return RSVPResult(success=False, status="event_full", message=f"Event is full or closed: {url}")

        # CAPTCHA detection
        captcha_count = await page.locator(
            "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], .g-recaptcha"
        ).count()
        if captcha_count:
            logger.warning("CAPTCHA detected on Partiful page: %s", url)
            return RSVPResult(
                success=False,
                status="manual_required",
                message=f"CAPTCHA detected -- manual registration required: {url}",
                confirmation_url=url,
            )

        # Click the RSVP button to open the form (Partiful often has a CTA button first)
        rsvp_btn = page.locator("button:has-text('RSVP'), a:has-text('RSVP'), button:has-text('Going')")
        if await rsvp_btn.count() > 0:
            await rsvp_btn.first.click()
            await page.wait_for_timeout(1_500)

        # Fill name field (Partiful may use a single name field or first+last)
        full_name = f"{first} {last}".strip()
        name_filled = False
        for selector in ["input[name*=name]", "input[placeholder*=Name]", "input[placeholder*=name]"]:
            locator = page.locator(selector)
            if await locator.count() > 0:
                await locator.first.fill(full_name)
                name_filled = True
                break

        if not name_filled:
            # Try separate first/last fields
            await self._fill_field(page, ["input[name*=first]", "input[placeholder*=First]"], first)
            await self._fill_field(page, ["input[name*=last]", "input[placeholder*=Last]"], last)

        # Fill email
        await self._fill_field(page, ["input[type=email]", "input[name*=email]", "input[placeholder*=Email]"], email)

        # Submit
        await page.locator(
            "button[type=submit], input[type=submit], button:has-text('Submit'), button:has-text('Confirm')"
        ).first.click()
        await page.wait_for_timeout(3_000)

        result_text = (await page.inner_text("body")).lower()
        if any(p in result_text for p in ("thank you", "see you there", "you are going", "confirmed", "rsvp confirmed")):
            return RSVPResult(success=True, status="success", message=f"Registered via Partiful: {url}", confirmation_url=url)
        if "already" in result_text:
            return RSVPResult(success=False, status="already_registered", message=f"Already registered: {url}")

        logger.warning("Partiful registration outcome unclear for %s", url)
        return RSVPResult(success=False, status="failed", message=f"Registration outcome unclear -- check manually: {url}", confirmation_url=url)

    @staticmethod
    async def _fill_field(page, selectors: list[str], value: str) -> None:
        for selector in selectors:
            locator = page.locator(selector)
            if await locator.count() > 0:
                await locator.first.fill(value)
                return
        logger.warning("Could not find field for selectors: %s", selectors)

    @staticmethod
    async def _save_screenshot(page, url: str) -> str:
        try:
            slug = url.split("//", 1)[-1].replace("/", "_")[:60]
            path = Path(tempfile.gettempdir()) / f"partiful_fail_{slug}.png"
            await page.screenshot(path=str(path), full_page=True)
            return str(path)
        except Exception:
            return "screenshot unavailable"

    async def check_availability(self, url: str) -> bool:
        return True