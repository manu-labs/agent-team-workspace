"""Kalshi RSA-PSS authentication helper.

Kalshi requires 3 headers on every authenticated request:
  KALSHI-ACCESS-KEY        — the Key ID (UUID)
  KALSHI-ACCESS-TIMESTAMP  — current epoch time in milliseconds
  KALSHI-ACCESS-SIGNATURE  — RSA-PSS (SHA256) signature of "{timestamp}{METHOD}{path}"

Reference: https://trading-api.readme.io/reference/api-keys
"""

import base64
import datetime
from functools import lru_cache

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


@lru_cache(maxsize=1)
def _load_private_key(pem_string: str):
    """Load and cache an RSA private key from a PEM string. Cached after first load."""
    return serialization.load_pem_private_key(
        pem_string.encode("utf-8"),
        password=None,
    )


def get_auth_headers(key_id: str, pem_key: str, method: str, path: str) -> dict:
    """Generate Kalshi auth headers for a single request.

    Args:
        key_id:  KALSHI_API_KEY_ID from config
        pem_key: KALSHI_API_KEY (PEM-encoded RSA private key) from config
        method:  HTTP method, uppercase ("GET", "POST", etc.)
        path:    Request path without query string (e.g. "/trade-api/v2/markets")

    Returns:
        Dict of auth headers to merge into the request, or empty dict if keys not set.
    """
    if not key_id or not pem_key:
        return {}

    private_key = _load_private_key(pem_key)

    timestamp = str(int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000))
    path_without_query = path.split("?")[0]
    message = f"{timestamp}{method}{path_without_query}".encode("utf-8")

    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.DIGEST_LENGTH,
        ),
        hashes.SHA256(),
    )

    return {
        "KALSHI-ACCESS-KEY": key_id,
        "KALSHI-ACCESS-SIGNATURE": base64.b64encode(signature).decode("utf-8"),
        "KALSHI-ACCESS-TIMESTAMP": timestamp,
    }
