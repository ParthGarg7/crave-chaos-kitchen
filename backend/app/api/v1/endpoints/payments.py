"""
Payment API Endpoints
Simulates payment processing with Stripe integration
"""
import asyncio
import random
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.core.failure_config import failure_simulator
from app.models.order import Order, PaymentMethod, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.order import PaymentCreate, PaymentResponse
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/payments", tags=["Payments"])


def _coerce_payment_method(raw: object) -> PaymentMethod:
    """Normalize DB / driver quirks (e.g. PG enum labels vs Python str Enum values)."""
    if isinstance(raw, PaymentMethod):
        return raw
    s = str(raw).strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "upi": PaymentMethod.UPI,
        "card": PaymentMethod.CARD,
        "credit_card": PaymentMethod.CREDIT_CARD,
        "debit_card": PaymentMethod.DEBIT_CARD,
        "paypal": PaymentMethod.PAYPAL,
        "cash": PaymentMethod.CASH,
    }
    if s in aliases:
        return aliases[s]
    try:
        return PaymentMethod(s)
    except ValueError:
        pass
    for m in PaymentMethod:
        if m.name.lower() == s:
            return m
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Order has an unsupported payment_method value: {raw!r}",
    )


# Simulated payment gateway responses
CARD_FAILURE_RESPONSES = [
    {"success": True, "message": "Payment processed successfully"},
    {"success": False, "message": "Card declined - insufficient funds", "decline_code": "insufficient_funds"},
    {"success": False, "message": "Card declined - incorrect CVV", "decline_code": "incorrect_cvv"},
    {"success": False, "message": "Card expired", "decline_code": "expired_card"},
    {"success": False, "message": "Processing error", "decline_code": "processing_error"},
]

UPI_FAILURE_RESPONSES = [
    {"success": False, "message": "UPI ID not found", "decline_code": "upi_id_not_found"},
    {"success": False, "message": "UPI PIN verification failed", "decline_code": "upi_pin_failed"},
    {"success": False, "message": "UPI bank server timeout", "decline_code": "upi_timeout"},
]


def generate_transaction_id() -> str:
    """Generate a mock transaction ID"""
    return f"txn_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"


def _requires_card_details(payment_method: PaymentMethod) -> bool:
    return payment_method in {
        PaymentMethod.CARD,
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
    }


def _validate_payment_input(payment_data: PaymentCreate, payment_method: PaymentMethod) -> None:
    """Validate gateway input based on selected payment method."""
    if _requires_card_details(payment_method):
        if not payment_data.card_number or len(payment_data.card_number.strip()) < 12:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Valid card number is required for card payments",
            )
        if not payment_data.cvv or not re.fullmatch(r"\d{3,4}", payment_data.cvv.strip()):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Valid CVV is required for card payments",
            )
        if not payment_data.expiry_month or not payment_data.expiry_year:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Card expiry month and year are required for card payments",
            )

    if payment_method == PaymentMethod.UPI:
        if not payment_data.upi_id or "@" not in payment_data.upi_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Valid UPI ID is required for UPI payments",
            )


def _select_failure(payment_method: PaymentMethod) -> dict:
    """Return realistic failure reason based on payment method."""
    if payment_method == PaymentMethod.UPI:
        return random.choice(UPI_FAILURE_RESPONSES)
    return random.choice([r for r in CARD_FAILURE_RESPONSES if not r["success"]])


@router.post("/process", response_model=PaymentResponse)
async def process_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a payment for an order"""
    order = db.query(Order).filter(Order.id == payment_data.order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify order belongs to current user
    if order.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to pay for this order"
        )
    
    # Check if already paid
    if order.payment_status == PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already paid"
        )

    pay_method = _coerce_payment_method(order.payment_method)

    # Validate method-specific payment details before simulating gateway result
    _validate_payment_input(payment_data, pay_method)

    # Simulate payment processing delay
    await asyncio.sleep(random.uniform(0.5, 2.0))

    # Simulate payment result (method-specific success rates)
    success_probability = failure_simulator.state.payment_success_rate_card
    if pay_method == PaymentMethod.UPI:
        success_probability = failure_simulator.state.payment_success_rate_upi

    if random.random() < success_probability:
        # Success
        order.payment_status = PaymentStatus.COMPLETED
        order.payment_transaction_id = generate_transaction_id()
        
        db.commit()
        
        return PaymentResponse(
            id=order.id,
            order_id=order.id,
            status=PaymentStatus.COMPLETED,
            amount=order.total,
            transaction_id=order.payment_transaction_id,
            message="Payment processed successfully",
            created_at=datetime.now(timezone.utc),
        )
    else:
        # Failure
        order.payment_status = PaymentStatus.FAILED
        db.commit()
        
        failure = _select_failure(pay_method)
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "PaymentFailed",
                "message": failure["message"],
                "decline_code": failure.get("decline_code"),
                "order_id": order.id
            }
        )


@router.get("/methods")
async def get_payment_methods():
    """Get available payment methods"""
    return {
        "methods": [
            {"id": "card", "name": "Card", "icon": "credit_card"},
            {"id": "credit_card", "name": "Credit Card", "icon": "credit_card"},
            {"id": "debit_card", "name": "Debit Card", "icon": "credit_card"},
            {"id": "paypal", "name": "PayPal", "icon": "paypal"},
            {"id": "cash", "name": "Cash on Delivery", "icon": "money"},
            {"id": "upi", "name": "UPI", "icon": "qr_code"},
        ]
    }


@router.post("/{order_id}/refund")
async def refund_payment(
    order_id: int,
    _: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Request a refund for an order (admin only)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.payment_status != PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order has not been paid"
        )
    
    # Simulate refund processing
    await asyncio.sleep(1.0)
    
    order.payment_status = PaymentStatus.REFUNDED
    db.commit()
    
    return {
        "message": "Refund processed successfully",
        "order_id": order_id,
        "refund_amount": order.total,
        "refund_transaction_id": generate_transaction_id()
    }
