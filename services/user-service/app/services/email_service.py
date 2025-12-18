import os
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM
        
    def send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send email"""
        # Check if SMTP is configured
        if not self.smtp_user or not self.smtp_password:
            print(f"SMTP not configured. Skipping email to {to_email}")
            print("To enable email sending, set SMTP_USER and SMTP_PASSWORD environment variables")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_from
            msg['To'] = to_email
            
            # Attach HTML body
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_password_reset_email(self, email: str, full_name: str, reset_link: str) -> bool:
        """Send password reset email"""
        subject = "Password Reset Request"
        html_body = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Dear {full_name},</p>
            <p>You requested a password reset for your account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_link}" style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>Or copy this link: <br><code>{reset_link}</code></p>
            <p><strong>This link expires in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </body>
        </html>
        """
        return self.send_email(email, subject, html_body)
    
    def send_welcome_email(self, email: str, full_name: str, password: str) -> bool:
        """Send welcome email with credentials"""
        subject = "Your Account Has Been Created"
        html_body = f"""
        <html>
        <body>
            <h2>Welcome, {full_name}!</h2>
            <p>Your account has been created in the Assignment Management System.</p>
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #f4f4f4; padding: 5px 10px; border-radius: 3px;">{password}</code></p>
            <p style="color: #d32f2f;"><strong>⚠️ Important:</strong> You will be required to change your password on first login.</p>
            <p>Please keep this information secure and do not share it with anyone.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </body>
        </html>
        """
        return self.send_email(email, subject, html_body)


# Singleton instance
email_service = EmailService()
