# Task Management System

A modern, full-stack task management application built with React frontend, Express.js backend, and background scheduler service, featuring comprehensive task management, recurring tasks, notifications.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### One-Command Setup

```bash
docker-compose up --build
```

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5500
- **API Health**: http://localhost:5500/api/health

### Demo Accounts

The system comes pre-seeded with demo data:

```bash
# Seed the database with demo data
docker-compose exec backend npm run seed
```

**Demo Users:**
- **Alice Johnson**: alice@demo.com / password123
- **Bob Smith**: bob@demo.com / password123  
- **Carol Davis**: carol@demo.com / password123

## 🏗️ Architecture

### Service Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Express API    │    │   Scheduler     │
│   (Port 3000)   │◄──►│   (Port 5500)   │◄──►│   (Background)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │    MongoDB      │    │     Redis       │
                       │   (Port 27017)  │    │   (Port 6379)   │
                       └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: React 18, Vite, ShadCN/UI, Tailwind CSS, Zustand
- **Backend**: Node.js, Express.js, MongoDB, Redis, JWT Auth
- **Scheduler**: Node.js, node-cron, rrule (RFC 5545)
- **Validation**: Shared Zod schemas across frontend/backend
- **Deployment**: Docker Compose with health checks

## 🎯 Key Features

### ✅ Task Management
- **CRUD Operations**: Create, read, update, delete tasks
- **Status Tracking**: To Do → In Progress → Done
- **Priority Levels**: Low, Medium, High, Urgent
- **Due Dates**: Date/time scheduling with timezone support
- **Categories**: User-defined task organization
- **Assignment**: Multi-user task assignment and collaboration

### 🔄 Recurring Tasks
- **Flexible Patterns**: Daily, weekly, monthly, custom (RFC 5545 rrule)
- **Smart Editing**: "This instance", "Future instances", "All instances"
- **Automatic Generation**: Background service creates task instances
- **Pattern Preview**: Visual recurrence pattern display

### 🔍 Search & Filtering
- **Real-time Search**: Search by title and description
- **Advanced Filters**: Status, assignee, category, due date
- **Combined Filtering**: Search + multiple filters simultaneously
- **Result Highlighting**: Matched text highlighting in results

### 🔔 Notification System
- **In-app Notifications**: Bell icon with unread badge
- **Smart Tray**: Notifications don't auto-mark as read
- **Event Types**: Task assignments, reminders, overdue alerts
- **Batch Actions**: Mark all read, individual deletion

### 👥 User Management
- **Authentication**: JWT-based with bcrypt password hashing
- **User Avatars**: Automatic initials from full name
- **Profile Management**: Update name and password
- **Multi-user Support**: Task assignment and collaboration

### 📱 Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Mobile gesture support
- **Progressive Enhancement**: Works across devices

## 📁 Project Structure

```
task-management-system/
├── frontend/                 # React SPA (Port 3000)
│   ├── src/
│   │   ├── components/      # UI components (ShadCN/UI)
│   │   ├── pages/          # Route components
│   │   ├── stores/         # Zustand state management
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
│   ├── Dockerfile
│   └── package.json
├── backend/                  # Express API (Port 5500)
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # Auth and validation middleware
│   ├── utils/              # Business logic utilities
│   ├── test/               # API tests
│   ├── Dockerfile
│   └── server.js
├── scheduler/                # Background service
│   ├── utils/              # Job processing logic
│   ├── config/             # Database configuration
│   ├── test/               # Scheduler tests
│   ├── Dockerfile
│   └── scheduler.js
├── shared/                   # Shared validation schemas
│   └── schemas/            # Zod validation schemas
├── docker-compose.yml        # Multi-service orchestration
└── README.md
```

## 🔧 Development Setup

### Docker Development (Recommended)

```bash
# Start all services with hot reloading
docker-compose up --build

# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f scheduler

# Stop all services
docker-compose down

# Reset database and volumes
docker-compose down -v
```

### Local Development

```bash
# Install dependencies for all services
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../scheduler && npm install
cd ../shared && npm install

# Start services in separate terminals
cd backend && npm run dev      # Port 5500
cd frontend && npm run dev     # Port 3000
cd scheduler && npm run dev    # Background
```

## 🧪 Testing

```bash
# Run all tests
docker-compose exec backend npm test
docker-compose exec frontend npm test
docker-compose exec scheduler npm test

# Run specific test suites
docker-compose exec backend npm run test:auth
docker-compose exec backend npm run test:tasks
docker-compose exec backend npm run test:notifications
```
