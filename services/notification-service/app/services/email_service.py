"""
Email Service for sending notifications via email.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_emails: List[str],
    subject: str,
    html_content: str,
    plain_content: str = None
):
    """
    Send an email to one or more recipients.
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML version of the email body
        plain_content: Plain text version (optional, will use html if not provided)
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = ", ".join(to_emails)
        message["Subject"] = subject
        
        # Add plain text part
        if plain_content:
            text_part = MIMEText(plain_content, "plain")
            message.attach(text_part)
        
        # Add HTML part
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
        )
        
        logger.info(f"Email sent successfully to {len(to_emails)} recipient(s)")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        # Don't raise exception - email failure shouldn't break notification creation
        return False


def create_notification_email_html(title: str, message: str, action_url: str = None) -> str:
    """
    Create a nicely formatted HTML email for notifications.
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                padding: 30px 20px;
            }}
            .content h2 {{
                color: #333;
                font-size: 20px;
                margin-top: 0;
            }}
            .content p {{
                color: #666;
                margin: 15px 0;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #999;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 Assignment Management System</h1>
            </div>
            <div class="content">
                <h2>{title}</h2>
                <p>{message}</p>
                {f'<a href="{action_url}" class="button">View Details</a>' if action_url else ''}
            </div>
            <div class="footer">
                <p>This is an automated message from Assignment Management System.</p>
                <p>Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

