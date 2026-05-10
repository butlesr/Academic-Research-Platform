# 🎓 Academic Research & Learning Management Platform

**Enterprise-grade, AI-powered Academic Research Management System** for universities, research institutes, and higher education institutions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Quick Start](#quick-start)
7. [Environment Setup](#environment-setup)
8. [Database Schema](#database-schema)
9. [API Documentation](#api-documentation)
10. [Deployment Guide](#deployment-guide)
11. [Security](#security)
12. [Testing](#testing)

---

## Overview

A unified academic ecosystem combining features of WhatsApp, Google Classroom, Moodle, Microsoft Teams, Trello, Notion, Zoom, SWAYAM/NPTEL, Research Tracking Systems, and Academic ERP.

**Designed for:**
- PhD Scholars & Research Guides
- PG Dissertation Students
- Project Students
- University Departments
- Research Laboratories

---

## Features

### 🔬 Research Scholar Management
- Scholar-wise dashboards with progress timelines
- Research project creation and milestone tracking
- Publication tracking and literature review monitoring
- AI-generated research insights and delay predictions
- Research activity logs and completion analytics

### 💬 Real-Time Communication (WhatsApp-style)
- One-to-one and group chats with Socket.IO
- File, image, video, and voice note sharing
- Message reactions, read receipts, typing indicators
- Pin important messages and AI discussion summaries
- Broadcast announcements to groups

### 🎯 Goal & Milestone Tracking
- Assign SMART goals with deadlines and priorities
- Divide goals into micro-steps/milestones
- Real-time progress updates with color-coded status
- AI-generated milestone suggestions
- Automated email/SMS/push reminders

### 📊 Visual Performance Tracking
- Color-coded status: Green/Yellow/Orange/Red/Gray
- Batch performance heatmaps
- Individual scholar analytics
- Overdue task reports

### 🤖 AI-Powered Features
- GPT-4 academic assistant for research guidance
- AI plagiarism risk analysis
- AI-generated progress insights and reports
- AI writing assistance (abstract, introduction)
- Automatic goal generation from research topics

### 📚 LMS & Course Management (SWAYAM-style)
- Course creation with module/lesson structure
- Video streaming with progress tracking
- Quiz after each module
- Course completion certificates

### 📝 Examination System
- MCQ, long-answer, viva, and quiz exams
- Randomized questions with timer
- Auto-grading and instant results
- Question bank with Bloom's taxonomy tagging

### 📅 Attendance Management
- QR code attendance scanning
- GPS location verification
- Online class attendance
- Defaulter list generation

### 📜 Certification System
- Auto-generated PDF certificates
- QR code verification
- Digital signatures
- Multiple certificate types

### 📈 Analytics Dashboards
- Institution-wide analytics (admin)
- Scholar progress overview (professor)
- Personal performance metrics (student)
- Activity heatmaps

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                │
├──────────────────┬──────────────────────────────────────┤
│   Next.js 14     │         Node.js + Express             │
│   Frontend       │         Backend API (REST)             │
│   (Port 3000)    │         (Port 5000)                    │
├──────────────────┼──────────────────────────────────────┤
│                  │    PostgreSQL  │  MongoDB  │  Redis    │
│   Socket.IO      │    (Data)     │  (Chat)   │  (Cache)  │
│   WebRTC         ├───────────────┴───────────┴──────────┤
│                  │              AWS S3 (Files)            │
└──────────────────┴──────────────────────────────────────┘
```

### Data Flow
- **REST API** → CRUD operations, authentication, business logic
- **Socket.IO** → Real-time chat, notifications, live progress updates
- **PostgreSQL** → Structured relational data (users, research, goals, etc.)
- **MongoDB** → Chat messages, conversation data (flexible schema)
- **Redis** → Session cache, API rate limiting, job queues
- **AWS S3** → File storage (thesis, assignments, profile pictures)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| State | Zustand, React Query (TanStack) |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Auth | JWT (access + refresh tokens), bcrypt, speakeasy (MFA) |
| Primary DB | PostgreSQL 16 |
| Chat DB | MongoDB 7 |
| Cache | Redis 7 |
| Real-time | Socket.IO 4 |
| Storage | AWS S3 |
| Email | Nodemailer (SMTP) |
| SMS | Twilio |
| Push | Firebase Cloud Messaging |
| AI | OpenAI GPT-4 API |
| PDF | PDFKit |
| Excel | ExcelJS |
| Containers | Docker + Docker Compose |

---

## Project Structure

```
academic-platform/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js         # PostgreSQL connection
│   │   │   ├── mongodb.js          # MongoDB connection
│   │   │   └── redis.js            # Redis connection
│   │   ├── controllers/
│   │   │   ├── authController.js   # Auth + MFA
│   │   │   ├── researchController.js
│   │   │   └── goalController.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT middleware
│   │   │   ├── errorHandler.js
│   │   │   └── validate.js
│   │   ├── models/
│   │   │   └── chat/Message.js     # MongoDB schemas
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── research.js
│   │   │   ├── goals.js
│   │   │   ├── chat.js
│   │   │   ├── files.js
│   │   │   ├── attendance.js
│   │   │   ├── assignments.js
│   │   │   ├── exams.js
│   │   │   ├── courses.js
│   │   │   ├── meetings.js
│   │   │   ├── analytics.js
│   │   │   ├── notifications.js
│   │   │   ├── reports.js
│   │   │   ├── certifications.js
│   │   │   ├── ai.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   ├── aiService.js        # OpenAI integration
│   │   │   ├── emailService.js     # SMTP email
│   │   │   ├── smsService.js       # Twilio SMS
│   │   │   ├── fileService.js      # AWS S3
│   │   │   └── notificationService.js # Firebase push
│   │   ├── socket/
│   │   │   └── index.js            # Socket.IO handlers
│   │   └── utils/
│   │       ├── logger.js           # Winston logger
│   │       └── AppError.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/guide/page.tsx
│   │   │   │   ├── dashboard/scholar/page.tsx
│   │   │   │   ├── goals/page.tsx
│   │   │   │   ├── chat/page.tsx
│   │   │   │   └── ai-assistant/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── goals/
│   │   │   │   ├── GoalDetailModal.tsx
│   │   │   │   └── CreateGoalModal.tsx
│   │   │   └── ui/
│   │   │       ├── MetricCard.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       └── ProgressRing.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios client + interceptors
│   │   │   └── utils.ts
│   │   └── store/
│   │       └── authStore.ts        # Zustand auth state
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── schema.sql                  # Complete PostgreSQL schema
├── docs/
│   └── api.md
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- MongoDB 7 (or use Docker)
- Redis 7 (or use Docker)

### Using Docker (Recommended)

```bash
# 1. Clone / navigate to project
cd academic-platform

# 2. Copy environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 3. Start all services
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# API:      http://localhost:5000
# API Docs: http://localhost:5000/api/v1
```

### Manual Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate   # Run database migrations
npm run seed      # Seed initial data (optional)
npm run dev       # Start dev server

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev       # Start Next.js dev server
```

---

## Environment Setup

### Backend `.env`

```env
# Core
NODE_ENV=development
PORT=5000

# Databases
PG_HOST=localhost
PG_DATABASE=academic_platform
PG_USER=postgres
PG_PASSWORD=your_password

MONGO_URI=mongodb://localhost:27017/academic_chat
REDIS_HOST=localhost

# JWT (generate with: openssl rand -hex 64)
JWT_SECRET=your_64_char_secret
JWT_REFRESH_SECRET=your_64_char_refresh_secret

# OpenAI
OPENAI_API_KEY=sk-...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password

# Firebase (push notifications)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Frontend URL (for CORS and emails)
FRONTEND_URL=http://localhost:3000
```

---

## Database Schema

The platform uses **PostgreSQL** for structured data and **MongoDB** for chat:

### Key PostgreSQL Tables
| Table | Purpose |
|-------|---------|
| `users` | All users with role-based access |
| `institutions` | University/institute records |
| `departments` | Academic departments |
| `research_projects` | PhD/PG research projects |
| `research_groups` | Guide's research groups |
| `goals` | Assigned goals/tasks |
| `goal_milestones` | Sub-steps of goals |
| `courses` | LMS courses |
| `assignments` | Course/group assignments |
| `exams` | Online examinations |
| `attendance_records` | Class attendance |
| `notifications` | In-app notifications |
| `certificates` | Issued certificates |
| `publications` | Research publications |
| `meetings` | Video meetings |
| `audit_logs` | Security audit trail |
| `file_storage` | File metadata |

### MongoDB Collections
| Collection | Purpose |
|-----------|---------|
| `conversations` | Chat rooms (direct/group) |
| `messages` | Individual chat messages |

---

## API Documentation

Base URL: `http://localhost:5000/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login + get tokens |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/verify-email/:token` | Verify email |
| POST | `/auth/forgot-password` | Request reset link |
| POST | `/auth/reset-password/:token` | Reset password |
| POST | `/auth/mfa/setup` | Setup 2FA |
| POST | `/auth/mfa/enable` | Enable 2FA |

### Research Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/research/groups` | Create research group |
| GET | `/research/groups` | Get my groups |
| POST | `/research/projects` | Create research project |
| GET | `/research/projects` | List projects |
| GET | `/research/projects/:id` | Project details |
| PATCH | `/research/projects/:id/progress` | Update progress |
| GET | `/research/projects/:id/ai-insights` | AI analysis |
| GET | `/research/dashboard/guide` | Guide overview |
| GET | `/research/dashboard/scholar` | Scholar dashboard |

### Goals & Milestones
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/goals` | Create/assign goal |
| GET | `/goals` | List goals (filtered) |
| GET | `/goals/:id` | Goal details + milestones |
| PATCH | `/goals/:id/status` | Update status |
| GET | `/goals/batch-progress` | Batch completion view |

### Chat (Real-time via Socket.IO)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/conversations/direct` | Start direct chat |
| POST | `/chat/conversations/group` | Create group chat |
| GET | `/chat/conversations` | My conversations |
| GET | `/chat/conversations/:id/messages` | Load messages |
| POST | `/chat/conversations/:id/summarize` | AI summary |

### Socket Events
| Event (emit) | Description |
|-------------|-------------|
| `chat:join` | Join conversation room |
| `chat:message` | Send message |
| `chat:typing` | Typing indicator |
| `chat:read` | Mark messages read |
| `chat:react` | React to message |
| `meeting:join` | Join video meeting |
| `meeting:signal` | WebRTC signaling |

---

## Deployment Guide

### Production with Docker

```bash
# 1. Set production environment
cp backend/.env.example backend/.env
# Set NODE_ENV=production, real DB credentials, etc.

# 2. Build and start
docker-compose -f docker-compose.yml up -d --build

# 3. Apply database schema
docker exec academic_backend node src/config/migrate.js

# 4. Setup SSL (recommended: Certbot + Nginx)
certbot --nginx -d yourdomain.com
```

### AWS EC2 Deployment

```bash
# Install Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose

# Clone and setup
git clone <repo> academic-platform
cd academic-platform
# Setup .env files
docker-compose up -d --build
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET` (64+ chars, random)
- Configure real AWS S3 bucket
- Set up Firebase for push notifications
- Configure SMTP for emails
- Set `FRONTEND_URL` to your domain
- Set `ALLOWED_ORIGINS` to your frontend domain

---

## Security

### Implemented Security Features
- **JWT Authentication** with short-lived access tokens (7d) and refresh tokens (30d)
- **Multi-Factor Authentication** (TOTP via Google Authenticator)
- **Password Hashing** with bcrypt (12 rounds)
- **Rate Limiting** on all API endpoints (100 req/15min, 20 for auth)
- **CORS** with domain whitelist
- **Helmet.js** security headers (XSS protection, CSP, HSTS)
- **SQL Injection prevention** via parameterized queries only
- **End-to-end encryption** for sensitive data
- **Audit Logs** for all critical actions
- **Role-based Access Control** (RBAC) on all endpoints
- **File upload validation** (type + size limits)
- **Token invalidation** on password change/logout
- **Session management** with device tracking

### Roles & Permissions
| Role | Access Level |
|------|-------------|
| `super_admin` | Full system control |
| `admin` | Institution management |
| `professor` | Own scholars, courses, groups |
| `phd_scholar` | Own research, goals |
| `pg_student` | Enrolled courses, goals |
| `external_examiner` | Assigned evaluations only |

---

## Testing

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report

# Frontend tests
cd frontend
npm test
```

### Test Coverage Areas
- Authentication flows (register, login, MFA, token refresh)
- Goal CRUD operations
- Research project management
- File upload/download
- Notification delivery
- Chat message persistence
- Certificate generation

---

## Mobile App (Flutter)

The platform supports a Flutter mobile app connecting to the same API.

**Supported platforms:** Android, iOS, Web

**Key mobile features:**
- Offline mode with local SQLite sync
- QR code attendance scanning
- Push notifications via FCM
- File upload from camera/gallery
- Biometric authentication

---

## AI Integration

| Feature | Model Used |
|---------|-----------|
| Research insights | GPT-4 Turbo |
| Goal generation | GPT-4 Turbo |
| Chat summarization | GPT-3.5 Turbo |
| Plagiarism analysis | GPT-4 Turbo |
| Writing assistance | GPT-4 Turbo |
| Academic chatbot | GPT-4 Turbo |
| Performance reports | GPT-3.5 Turbo |

---

## Support & Contact

For technical support, raise an issue in the project repository.

**Built for:** Pharmacy Colleges, Engineering Institutes, Medical Universities, Research Laboratories, and all Higher Education Institutions.

---

*Academic Research Platform — Empowering Research Excellence Through Technology*
