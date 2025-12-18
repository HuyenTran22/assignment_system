import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoginPage from '@/modules/auth/pages/LoginPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import CoursesPage from '@/modules/courses/pages/CoursesPage';
import CourseManagementPage from '@/modules/courses/pages/CourseManagementPage';
import CourseStudentsPage from '@/modules/courses/pages/CourseStudentsPage';
import CourseMaterialsPage from '@/modules/courses/pages/CourseMaterialsPage';
import QuizzesPage from '@/modules/courses/pages/QuizzesPage';
import QuizQuestionsPage from '@/modules/courses/pages/QuizQuestionsPage';
import TakeQuizPage from '@/modules/courses/pages/TakeQuizPage';
import QuizAttemptsPage from '@/modules/courses/pages/QuizAttemptsPage';
import QuizStudentsPage from '@/modules/courses/pages/QuizStudentsPage';
import DiscussionForumPage from '@/modules/courses/pages/DiscussionForumPage';
import DiscussionThreadPage from '@/modules/courses/pages/DiscussionThreadPage';
import LiveClassesPage from '@/modules/courses/pages/LiveClassesPage';
import LiveSessionPage from '@/modules/courses/pages/LiveSessionPage';
import CertificatesPage from '@/modules/courses/pages/CertificatesPage';
import CertificateViewPage from '@/modules/courses/pages/CertificateViewPage';
import VideoCallPage from '@/modules/courses/pages/VideoCallPage';
import AnalyticsDashboardPage from '@/modules/analytics/pages/AnalyticsDashboardPage';
import AssignmentsPage from '@/modules/assignments/pages/AssignmentsPage';
import AssignmentDetailPage from '@/modules/assignments/pages/AssignmentDetailPage';
import SubmitAssignmentPage from '@/modules/assignments/pages/SubmitAssignmentPage';
import PlagiarismReportPage from '@/modules/assignments/pages/PlagiarismReportPage';
const AssignmentSubmissionsPage = lazy(() => import('@/modules/assignments/pages/AssignmentSubmissionsPage'));
import GradesPage from '@/modules/grading/pages/GradesPage';
import GradeTrackingPage from '@/modules/grading/pages/GradeTrackingPage';
import CourseGradesPage from '@/modules/grading/pages/CourseGradesPage';
import PeerReviewsPage from '@/modules/peer-reviews/pages/PeerReviewsPage';
import NotificationsPage from '@/modules/notifications/pages/NotificationsPage';
import ProtectedRoute from '@/router/ProtectedRoute';

// Admin Pages
import AdminDashboardPage from '@/modules/admin/pages/AdminDashboardPage';
import UserManagementPage from '@/modules/admin/pages/UserManagementPage';
import CSVImportPage from '@/modules/admin/pages/CSVImportPage';
import AdminCoursesPage from '@/modules/admin/pages/AdminCoursesPage';
import ProfilePage from '@/modules/profile/pages/ProfilePage';

// Password Pages
import ForgotPasswordPage from '@/modules/password/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/modules/password/pages/ResetPasswordPage';
import ForcePasswordChange from '@/modules/password/components/ForcePasswordChange';
import { SnackbarProvider } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import AutoLogoutProvider from '@/shared/components/AutoLogoutProvider';

export default function App() {
    const { user } = useAuthStore();

    return (
        <SnackbarProvider maxSnack={3}>
            <BrowserRouter>
                <AutoLogoutProvider>
                    {user && <ForcePasswordChange />}
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />

                        {/* Protected Routes */}
                        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                        <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId" element={<ProtectedRoute><CourseManagementPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/students" element={<ProtectedRoute><CourseStudentsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/materials" element={<ProtectedRoute><CourseMaterialsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes" element={<ProtectedRoute><QuizzesPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes/:quizId/questions" element={<ProtectedRoute><QuizQuestionsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes/:quizId/take" element={<ProtectedRoute><TakeQuizPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes/:quizId/attempts" element={<ProtectedRoute><QuizAttemptsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes/:quizId/attempts/:attemptId" element={<ProtectedRoute><QuizAttemptsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/quizzes/:quizId/students" element={<ProtectedRoute><QuizStudentsPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/discussions" element={<ProtectedRoute><DiscussionForumPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/discussions/:threadId" element={<ProtectedRoute><DiscussionThreadPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/live-sessions" element={<ProtectedRoute><LiveClassesPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/live-sessions/:sessionId" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/video-call" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/certificates/:certificateId" element={<ProtectedRoute><CertificateViewPage /></ProtectedRoute>} />
                        <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/analytics" element={<ProtectedRoute><AnalyticsDashboardPage /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboardPage /></ProtectedRoute>} />
                        <Route path="/assignments" element={<ProtectedRoute><AssignmentsPage /></ProtectedRoute>} />
                        <Route path="/assignments/:assignmentId" element={<ProtectedRoute><AssignmentDetailPage /></ProtectedRoute>} />
                        <Route path="/assignments/:assignmentId/submit" element={<ProtectedRoute><SubmitAssignmentPage /></ProtectedRoute>} />
                        <Route path="/assignments/:assignmentId/submissions" element={<ProtectedRoute><Suspense fallback={<div>Loading...</div>}><AssignmentSubmissionsPage /></Suspense></ProtectedRoute>} />
                        <Route path="/assignments/:assignmentId/plagiarism-report" element={<ProtectedRoute><PlagiarismReportPage /></ProtectedRoute>} />
                        <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
                        <Route path="/grades/tracking" element={<ProtectedRoute><GradeTrackingPage /></ProtectedRoute>} />
                        <Route path="/courses/:courseId/grades" element={<ProtectedRoute><CourseGradesPage /></ProtectedRoute>} />
                        <Route path="/peer-reviews" element={<ProtectedRoute><PeerReviewsPage /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
                        <Route path="/admin/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
                        <Route path="/admin/import" element={<ProtectedRoute><CSVImportPage /></ProtectedRoute>} />
                        <Route path="/admin/courses" element={<ProtectedRoute><AdminCoursesPage /></ProtectedRoute>} />

                        {/* Redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </AutoLogoutProvider>
            </BrowserRouter>
        </SnackbarProvider>
    );
}

