# Import Course model for relationship
# This is a stub - Course model should be imported from course-service
# For now, we'll use a simple reference

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

# This is just for type hints - actual Course model is in course-service
# In a real microservices setup, we'd use service-to-service calls instead

