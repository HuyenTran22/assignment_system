"""
Models package - imports all models to register with the unified Base.
This ensures all tables are created when running migrations.
"""
from app.models.base import Base

# User related models
from app.models.user import User, UserRole
from app.models.password import PasswordResetToken, PasswordHistory
from app.models.profile import UserProfile

# Course related models
from app.models.course import Course, CourseEnrollment, CourseModule, CourseRole
from app.models.course_material import CourseMaterial, UserCourseProgress, MaterialType
from app.models.discussion import DiscussionThread, DiscussionReply
from app.models.live_class import LiveSession, SessionAttendance, SessionRecording
from app.models.video_call import VideoCallRoom, VideoCallParticipant, VideoCallStatus
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizAnswer

# Assignment/Submission related models
from app.models.assignment import Assignment, AssignmentFile
from app.models.submission import Submission, SubmissionFile, SubmissionStatus
from app.models.grade import Grade
from app.models.peer_review import PeerReview

# Notification
from app.models.notification import Notification, NotificationType

__all__ = [
    # Base
    "Base",
    # User
    "User", "UserRole", "PasswordResetToken", "PasswordHistory", "UserProfile",
    # Course
    "Course", "CourseEnrollment", "CourseModule", "CourseRole",
    "CourseMaterial", "UserCourseProgress", "MaterialType",
    "DiscussionThread", "DiscussionReply",
    "LiveSession", "SessionAttendance", "SessionRecording",
    "VideoCallRoom", "VideoCallParticipant", "VideoCallStatus",
    "Quiz", "QuizQuestion", "QuizAttempt", "QuizAnswer",
    # Assignment/Submission
    "Assignment", "AssignmentFile",
    "Submission", "SubmissionFile", "SubmissionStatus",
    "Grade", "PeerReview",
    # Notification
    "Notification", "NotificationType",
]
