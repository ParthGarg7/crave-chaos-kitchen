"""
Payment API Endpoints
Simulates payment processing with Stripe integration
"""
import random
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.order import Order, PaymentStatus
from app.models.user import User
from app.schemas.order import PaymentCreate, PaymentResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])


# Simulated payment gateway responses
PAYMENT_RESPONSES = [
    {"success": True, "message": "Payment processed successfully"},
    {"success": False, "message": "Card declined - insufficient funds", "decline_code": "insufficient_funds"},
    {"success": False, "message": "Card declined - incorrect CVV", "decline_code": "incorrect_cvv"},
    {"success": False, "message": "Card expired", "decline_code": "expired_card"},
    {"success": False, "message": "Processing error", "decline_code": "processing_error"},
]


def generate_transaction_id() -> str:
    """Generate a mock transaction ID"""
    return f"txn_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"


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
    
    # Simulate payment processing delay
    await asyncio.sleep(random.uniform(0.5, 2.0))
    
    # Simulate payment result (90% success rate normally)
    if random.random() < 0.9:
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
            created_at=datetime.utcnow()
        )
    else:
        # Failure
        order.payment_status = PaymentStatus.FAILED
        db.commit()
        
        failure = random.choice([r for r in PAYMENT_RESPONSES if not r["success"]])
        
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
            {"id": "credit_card", "name": "Credit Card", "icon": "credit_card"},
            {"id": "debit_card", "name": "Debit Card", "icon": "credit_card"},
            {"id": "paypal", "name": "PayPal", "icon": "paypal"},
            {"id": "cash", "name": "Cash on Delivery", "icon": "money"},
        ]
    }


@router.post("/{order_id}/refund")
async def refund_payment(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request a refund for an order (admin only in this demo)"""
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
