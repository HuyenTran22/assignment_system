import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Certificate(Base):
    __tablename__ = "certificates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    certificate_number = Column(String(100), unique=True, nullable=False, index=True)  # Unique certificate number
    verification_code = Column(String(50), unique=True, nullable=False, index=True)  # For public verification
    
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    issued_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # Teacher/Admin who issued
    
    # Certificate content
    student_name = Column(String(255), nullable=False)
    course_name = Column(String(255), nullable=False)
    completion_date = Column(DateTime(timezone=True), nullable=False)
    grade = Column(String(50), nullable=True)  # Optional grade/score
    
    # Metadata
    template_id = Column(UUID(as_uuid=True), ForeignKey("certificate_templates.id"), nullable=True)
    pdf_url = Column(String(500), nullable=True)  # URL to generated PDF
    is_verified = Column(Boolean, default=False, nullable=False)  # If certificate has been verified
    
    # Relationships
    course = relationship("Course")
    user = relationship("User", foreign_keys=[user_id])
    issuer = relationship("User", foreign_keys=[issued_by])
    template = relationship("CertificateTemplate")


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template design (JSON format for flexibility)
    # Contains: background_image_url, text_positions, fonts, colors, etc.
    design_config = Column(Text, nullable=False)  # JSON string
    
    is_default = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course")
    creator = relationship("User")

