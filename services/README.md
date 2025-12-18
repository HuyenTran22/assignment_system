# Microservices Structure

```
services/
├── api-gateway/          # API Gateway (Port 8000)
├── auth-service/         # Authentication Service (Port 8001)
├── user-service/         # User Management Service (Port 8002)
├── course-service/       # Course Service (Port 8003)
├── assignment-service/   # Assignment Service (Port 8004)
├── submission-service/   # Submission Service (Port 8005)
├── grading-service/      # Grading Service (Port 8006)
├── peer-review-service/  # Peer Review Service (Port 8007)
├── plagiarism-service/   # Plagiarism Service (Port 8008)
└── notification-service/ # Notification Service (Port 8009)
```

Each service follows this structure:
```
service-name/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   ├── models/
│   ├── schemas/
│   ├── api/
│   └── services/
├── alembic/
├── requirements.txt
├── Dockerfile
└── .env.example
```

