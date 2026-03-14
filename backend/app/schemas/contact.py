"""
Contact Support Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    """Request body for the contact support endpoint"""
    name: str = Field(..., min_length=1, max_length=100, description="Sender's full name")
    email: EmailStr = Field(..., description="Sender's email address")
    message: str = Field(..., min_length=10, max_length=2000, description="Support message")


class ContactResponse(BaseModel):
    """Response returned after a contact support submission"""
    success: bool
    message: str
    ticket_id: str
    timestamp: str
