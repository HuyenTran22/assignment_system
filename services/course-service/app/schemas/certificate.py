from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class CertificateBase(BaseModel):
    student_name: str = Field(..., min_length=1, max_length=255)
    course_name: str = Field(..., min_length=1, max_length=255)
    completion_date: datetime
    grade: Optional[str] = None


class CertificateCreate(CertificateBase):
    course_id: UUID
    user_id: UUID
    template_id: Optional[UUID] = None


class CertificateResponse(CertificateBase):
    id: UUID
    course_id: UUID
    user_id: UUID
    certificate_number: str
    verification_code: str
    issued_at: datetime
    issued_by: UUID
    template_id: Optional[UUID] = None
    pdf_url: Optional[str] = None
    is_verified: bool
    issuer_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class CertificateVerifyResponse(BaseModel):
    is_valid: bool
    certificate: Optional[CertificateResponse] = None
    message: str


class CertificateTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    design_config: str = Field(..., min_length=1)  # JSON string
    is_default: bool = False
    is_active: bool = True


class CertificateTemplateCreate(CertificateTemplateBase):
    course_id: Optional[UUID] = None


class CertificateTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    design_config: Optional[str] = Field(None, min_length=1)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class CertificateTemplateResponse(CertificateTemplateBase):
    id: UUID
    course_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class CertificateGenerateRequest(BaseModel):
    course_id: UUID
    user_id: UUID
    template_id: Optional[UUID] = None
    grade: Optional[str] = None

