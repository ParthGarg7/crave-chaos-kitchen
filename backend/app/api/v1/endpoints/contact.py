"""
Contact Support Endpoint

POST /api/v1/contact-support

Accepts name, email, and message. Returns a JSON response with a stub
ticket ID. No real email/ticket system — designed as a clean, simulatable
endpoint whose failure behaviour is driven by the existing Failure Simulator
middleware (HTTP 500 / 503 / timeout scenarios can be injected via the
/failure-simulator controls without adding any special query params here).
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import uuid

from app.schemas.contact import ContactRequest, ContactResponse

router = APIRouter(prefix="/contact-support", tags=["Contact Support"])


@router.post("", response_model=ContactResponse, summary="Submit a contact support request")
async def submit_contact(payload: ContactRequest) -> ContactResponse:
    """
    Submit a contact support message.

    - **name**: Sender's full name (1–100 characters)
    - **email**: Sender's email address
    - **message**: Support message body (10–2000 characters)

    Returns a confirmation with a stub ticket ID.
    Failure scenarios (500, 503, timeout) are injected via the
    Failure Simulator — no simulation params needed on this endpoint.
    """
    ticket_id = f"TICKET-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    return ContactResponse(
        success=True,
        message=f"Thank you {payload.name}, we received your message and will respond to {payload.email} shortly.",
        ticket_id=ticket_id,
        timestamp=timestamp,
    )
