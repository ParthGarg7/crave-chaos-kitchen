"""
Tests for single-purpose action tokens (password reset, email verification).
"""
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.auth import create_action_token, decode_action_token


def test_roundtrip_password_reset_token():
    token = create_action_token(42, "password_reset", expires_minutes=30)
    assert decode_action_token(token, "password_reset") == 42


def test_roundtrip_verify_email_token():
    token = create_action_token(7, "verify_email", expires_minutes=60)
    assert decode_action_token(token, "verify_email") == 7


def test_purpose_mismatch_rejected():
    """A verification token must not be usable to reset a password."""
    token = create_action_token(42, "verify_email", expires_minutes=60)
    with pytest.raises(HTTPException) as exc:
        decode_action_token(token, "password_reset")
    assert exc.value.status_code == 400


def test_access_token_rejected_as_action_token():
    """A normal login token must not pass as a reset token."""
    from app.api.v1.endpoints.auth import create_access_token
    token = create_access_token({"sub": "42"})
    with pytest.raises(HTTPException):
        decode_action_token(token, "password_reset")


def test_garbage_token_rejected():
    with pytest.raises(HTTPException):
        decode_action_token("not-a-token", "password_reset")
