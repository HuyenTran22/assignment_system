from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.assignment import Assignment, AssignmentFile
from app.models.submission import Submission, SubmissionFile

__all__ = [
    "User",
    "UserRole",
    "Course",
    "CourseEnrollment",
    "CourseRole",
    "Assignment",
    "AssignmentFile",
    "Submission",
    "SubmissionFile",
]

