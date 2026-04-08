from fastapi import HTTPException

from app.api.v1.endpoints.payments import _select_failure, _validate_payment_input
from app.models.order import PaymentMethod
from app.schemas.order import PaymentCreate


def test_card_payment_requires_valid_card_details():
    payload = PaymentCreate(order_id=1, card_number="4111111111111111", expiry_month="12", expiry_year="2030", cvv="123")
    _validate_payment_input(payload, PaymentMethod.CARD)


def test_card_payment_rejects_missing_cvv():
    payload = PaymentCreate(order_id=1, card_number="4111111111111111", expiry_month="12", expiry_year="2030")
    try:
        _validate_payment_input(payload, PaymentMethod.CARD)
        assert False, "Expected validation error for missing CVV"
    except HTTPException as exc:
        assert exc.status_code == 422


def test_upi_payment_requires_upi_id():
    payload = PaymentCreate(order_id=1, upi_id="user@okaxis")
    _validate_payment_input(payload, PaymentMethod.UPI)


def test_upi_payment_rejects_invalid_upi_id():
    payload = PaymentCreate(order_id=1, upi_id="invalid-upi")
    try:
        _validate_payment_input(payload, PaymentMethod.UPI)
        assert False, "Expected validation error for invalid UPI ID"
    except HTTPException as exc:
        assert exc.status_code == 422


def test_failure_selection_uses_upi_error_codes():
    failure = _select_failure(PaymentMethod.UPI)
    assert failure["decline_code"].startswith("upi_")
