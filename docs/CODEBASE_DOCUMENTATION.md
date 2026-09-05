# FinPlanAI Codebase Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Backend System](#backend-system)
5. [Frontend System](#frontend-system)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Data Flow](#data-flow)
9. [Authentication System](#authentication-system)
10. [Key Features](#key-features)
11. [Development Setup](#development-setup)
12. [Technology Stack](#technology-stack)

## Overview

FinPlanAI is a comprehensive financial planning application that provides users with tools for budget management, investment tracking, financial goal setting, and AI-powered insights. The application follows a modern full-stack architecture with a React frontend and a hybrid backend system supporting both Node.js/Express and FastAPI/Python implementations.

## Architecture

The application uses a **3-tier architecture**:

```
┌─────────────────────────┐
│     Frontend (React)    │  ← User Interface Layer
│     Port: 3001          │
└─────────────────────────┘
            │
            ├─ HTTP/REST API
            │
┌─────────────────────────┐
│   Backend Services      │  ← Business Logic Layer
│   FastAPI: Port 8000    │
│   Node.js: Port 5000    │
└─────────────────────────┘
            │
            ├─ Database Queries
            │
┌─────────────────────────┐
│   Database Layer        │  ← Data Persistence Layer
│   MySQL/SQLite          │
└─────────────────────────┘
```

## Project Structure

```
FinPlanAI/
├── frontend/                    # React Application
│   ├── src/
│   │   ├── api/                # API integration layer
│   │   ├── auth/               # Authentication context
│   │   ├── pages/              # React components/pages
│   │   │   ├── Dashboard/      # Dashboard components
│   │   │   └── HomePage/       # Landing page components
│   │   └── assets/             # Static assets
│   ├── public/                 # Public assets
│   └── package.json            # Frontend dependencies
│
├── backend/                     # Dual Backend Implementation
│   ├── src/                    # Node.js/Express Backend
│   │   ├── config/             # Configuration files
│   │   ├── middlewares/        # Express middlewares
│   │   ├── models/             # Database models
│   │   ├── utils/              # Utility functions
│   │   ├── views/              # Route handlers
│   │   └── server.js           # Express server entry point
│   │
│   ├── app/                    # FastAPI Backend
│   │   ├── core/               # Core configuration
│   │   ├── models/             # SQLAlchemy models
│   │   ├── routers/            # API route handlers
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic services
│   │   ├── middleware/         # FastAPI middlewares
│   │   └── utils/              # Utility functions
│   │
│   ├── main.py                 # FastAPI server entry point
│   ├── start_fastapi.py        # FastAPI startup script
│   └── init_sqlite_db.py       # Database initialization
│
└── INTEGRATION_COMPLETE.md     # Integration documentation
```

## Backend System

The application supports **dual backend implementations**:

### FastAPI Backend (Primary - Python)
- **Entry Point**: `main.py`
- **Port**: 8000
- **Features**: 
  - Automatic API documentation (/docs)
  - Type safety with Pydantic
  - Async support
  - SQLAlchemy ORM
  - JWT authentication with cookie-based refresh tokens

#### Key Components:

**Core Configuration** (`app/core/`):
- `config.py`: Application settings and environment variables
- `database.py`: Database connection and session management

**Models** (`app/models/`):
- `user.py`: User account model with SQLAlchemy
- `refresh_token.py`: Token management model

**Routers** (`app/routers/`):
- `auth.py`: Authentication endpoints (signup, login, refresh, logout)
- `me.py`: Current user information endpoints
- `dashboard.py`: Dashboard data endpoints
- `profile.py`: User profile management
- `portfolio.py`: Portfolio management

**Services** (`app/services/`):
- `auth_service.py`: Authentication business logic

**Middleware** (`app/middleware/`):
- `auth.py`: JWT token validation and user context

### Node.js Backend (Legacy - JavaScript)
- **Entry Point**: `src/server.js`
- **Port**: 5000
- **Features**:
  - Express.js framework
  - MySQL connection pooling
  - JWT authentication
  - Cookie-based session management

#### Key Components:

**Models** (`src/models/`):
- `user.model.js`: User database operations
- `profile.model.js`: Profile management
- `refreshToken.model.js`: Token lifecycle management

**Routes** (`src/views/`):
- `auth.routes.js`: Authentication endpoints
- `profile.routes.js`: Profile management
- `me.routes.js`: User information

**Middleware** (`src/middlewares/`):
- `auth.middleware.js`: JWT validation
- `error.middleware.js`: Global error handling

## Frontend System

### React Application Structure

**Main Application** (`src/App.js`):
- Router configuration with React Router v6
- Authentication provider wrapping
- Header/Footer layout management

**Authentication Context** (`src/auth/AuthProvider.jsx`):
- Global authentication state management
- Token refresh automation
- User session persistence
- Login/logout functionality

**Page Components**:

**Home Page** (`src/pages/HomePage.jsx`):
- Landing page with feature showcase
- Navigation to login and signup

**Login Page** (`src/pages/LoginPage.jsx`):
- User authentication form
- Integration with auth API

**Profile Creation** (`src/pages/ProfileCreation.jsx`):
- Multi-step profile setup
- Financial information collection

**Main Dashboard** (`src/pages/main-dashboard.jsx`):
- Tab-based navigation system
- Six main sections:
  - Dashboard: Overview and metrics
  - Portfolio: Investment tracking
  - Market Analysis: Market data and trends
  - Financial Goals: Goal setting and tracking
  - AI-Insights: Streamlit app integration
  - Profile: User settings and information

### Dashboard Components

**Dashboard Tab** (`src/pages/Dashboard/dashboard-tab.jsx`):
- Financial overview cards
- Quick metrics and summaries

**Portfolio Tab** (`src/pages/Dashboard/portfolio-tab.jsx`):
- Investment portfolio visualization
- Asset allocation charts

**Market Analysis Tab** (`src/pages/Dashboard/market-analysis-tab.jsx`):
- Market trends and analysis
- Economic indicators

**Financial Goals** (`src/pages/Dashboard/financial-goals.jsx`):
- Goal creation and tracking
- Progress visualization

**Profile Tab** (`src/pages/Dashboard/profile-tab.jsx`):
- User profile management
- Settings and preferences

### API Integration Layer

**Base API Configuration** (`src/api/index.js`):
- Axios instance with interceptors
- Automatic token attachment
- Error handling and retry logic

**Authentication API** (`src/api/auth.js`):
- Login/signup/logout functions
- Token refresh management
- Session validation

**User API** (`src/api/user.js`):
- Current user information
- Profile data retrieval

**Profile API** (`src/api/profile.js`):
- Profile creation and updates
- Financial information management

**Portfolio API** (`src/api/portfolio.js`):
- Investment data management
- Portfolio analytics

## Database Schema

The application uses a comprehensive relational database schema:

### Core Tables

**user_accounts**:
```sql
- user_id (PRIMARY KEY, AUTO_INCREMENT)
- full_name (VARCHAR 255, NOT NULL)
- email (VARCHAR 255, UNIQUE, NOT NULL) 
- password_hash (VARCHAR 255, NOT NULL)
- profile_completed (BOOLEAN, DEFAULT FALSE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**refresh_tokens**:
```sql
- id (PRIMARY KEY, AUTO_INCREMENT)
- user_id (FOREIGN KEY → user_accounts)
- token_hash (VARCHAR 255, NOT NULL)
- expires_at (DATETIME, NOT NULL)
- revoked (BOOLEAN, DEFAULT FALSE)
- created_at (TIMESTAMP)
```

**user_profiles**:
```sql
- profile_id (PRIMARY KEY, AUTO_INCREMENT)
- user_id (FOREIGN KEY → user_accounts, UNIQUE)
- age (INT)
- income (DECIMAL 15,2)
- savings (DECIMAL 15,2)
- expenses (DECIMAL 15,2)
- financial_goals (TEXT)
- risk_tolerance (ENUM: low, medium, high)
- investment_experience (ENUM: beginner, intermediate, advanced)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**financial_goals**:
```sql
- goal_id (PRIMARY KEY, AUTO_INCREMENT)
- user_id (FOREIGN KEY → user_accounts)
- goal_name (VARCHAR 255, NOT NULL)
- target_amount (DECIMAL 15,2, NOT NULL)
- current_amount (DECIMAL 15,2, DEFAULT 0)
- target_date (DATE)
- priority (ENUM: low, medium, high)
- status (ENUM: active, completed, paused)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**budget_categories**:
```sql
- category_id (PRIMARY KEY, AUTO_INCREMENT)
- user_id (FOREIGN KEY → user_accounts)
- category_name (VARCHAR 100, NOT NULL)
- budgeted_amount (DECIMAL 15,2, NOT NULL)
- spent_amount (DECIMAL 15,2, DEFAULT 0)
- category_type (ENUM: income, expense)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**transactions**:
```sql
- transaction_id (PRIMARY KEY, AUTO_INCREMENT)
- user_id (FOREIGN KEY → user_accounts)
- category_id (FOREIGN KEY → budget_categories)
- amount (DECIMAL 15,2, NOT NULL)
- description (VARCHAR 255)
- transaction_type (ENUM: income, expense)
- transaction_date (DATE, NOT NULL)
- created_at (TIMESTAMP)
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/signup` | User registration | `{name, email, password}` | `{message, user}` |
| POST | `/auth/login` | User authentication | `{email, password}` | `{accessToken, profileCompleted, fullName}` |
| POST | `/auth/refresh` | Token refresh | (cookies) | `{accessToken}` |
| POST | `/auth/logout` | User logout | (cookies) | `{message}` |

### User Management Endpoints

| Method | Endpoint | Description | Headers | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/me/` | Current user info | Authorization: Bearer {token} | `{account, profileCompleted}` |

### Profile Endpoints

| Method | Endpoint | Description | Headers | Request Body | Response |
|--------|----------|-------------|---------|--------------|----------|
| GET | `/api/profile/` | Get user profile | Authorization: Bearer {token} | - | `{profile}` |
| POST | `/api/profile/` | Create/update profile | Authorization: Bearer {token} | `{age, income, savings, expenses, goals, riskTolerance, experience}` | `{profile}` |

### Dashboard Endpoints

| Method | Endpoint | Description | Headers | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/dashboard/` | Dashboard data | Authorization: Bearer {token} | `{metrics, goals, recent_transactions}` |

### Portfolio Endpoints

| Method | Endpoint | Description | Headers | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/portfolio/` | Portfolio data | Authorization: Bearer {token} | `{holdings, performance, analytics}` |

## Data Flow

### User Registration Flow
```
1. User submits registration form
   ↓
2. Frontend sends POST /auth/signup
   ↓
3. Backend validates input (Joi/Pydantic)
   ↓
4. Password hashed (bcrypt)
   ↓
5. User record created in database
   ↓
6. Success response sent to frontend
   ↓
7. User redirected to login page
```

### Authentication Flow
```
1. User submits login credentials
   ↓
2. Frontend sends POST /auth/login
   ↓
3. Backend validates credentials
   ↓
4. JWT access token generated (15min expiry)
   ↓
5. Refresh token generated (7 days expiry)
   ↓
6. Refresh token stored as httpOnly cookie
   ↓
7. Access token sent to frontend
   ↓
8. Frontend stores token and updates auth state
```

### Protected Route Access Flow
```
1. Frontend makes API request with Bearer token
   ↓
2. Backend middleware validates JWT token
   ↓
3. User information extracted from token
   ↓
4. Request proceeds with user context
   ↓
5. If token expired, frontend uses refresh token
   ↓
6. New access token obtained automatically
   ↓
7. Original request retried with new token
```

### Profile Creation Flow
```
1. User completes profile form
   ↓
2. Frontend sends POST /api/profile/
   ↓
3. Backend validates financial data
   ↓
4. Profile record created/updated
   ↓
5. User account marked as profile_completed
   ↓
6. Dashboard access granted
```

## Authentication System

### Token Architecture

**Access Tokens (JWT)**:
- **Expiry**: 15 minutes
- **Storage**: localStorage (frontend)
- **Usage**: API request authorization
- **Payload**: `{userId, email, iat, exp}`

**Refresh Tokens**:
- **Expiry**: 7 days
- **Storage**: httpOnly cookies
- **Usage**: Access token renewal
- **Database**: Stored hashed with revocation support

### Security Features

1. **Password Security**:
   - bcrypt hashing with salt rounds
   - Minimum password complexity requirements

2. **Token Security**:
   - JWT with strong secret keys
   - Short-lived access tokens
   - Automatic token rotation

3. **Cookie Security**:
   - httpOnly cookies for refresh tokens
   - Secure flag in production
   - SameSite protection

4. **CORS Protection**:
   - Configured allowed origins
   - Credential support for cookies

5. **Input Validation**:
   - Joi schemas (Node.js backend)
   - Pydantic models (FastAPI backend)
   - SQL injection prevention

## Key Features

### 1. User Management
- Registration with email verification
- Secure authentication with JWT tokens
- Profile completion tracking
- Session management

### 2. Financial Profiling
- Personal financial information collection
- Risk tolerance assessment
- Investment experience evaluation
- Goal setting and tracking

### 3. Dashboard Analytics
- Financial overview and metrics
- Budget tracking and analysis
- Goal progress monitoring
- Transaction categorization

### 4. Portfolio Management
- Investment tracking and analysis
- Asset allocation visualization
- Performance monitoring
- Risk assessment

### 5. Market Analysis
- Market trends and data
- Economic indicators
- Investment research tools
- Performance benchmarking

### 6. AI-Powered Insights
- Streamlit application integration
- Advanced financial analytics
- Predictive modeling
- Personalized recommendations

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- MySQL 8.0+ or SQLite
- Git

### Backend Setup (FastAPI)

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database**:
   ```bash
   python init_sqlite_db.py
   ```

5. **Configure environment** (create `.env`):
   ```env
   DATABASE_URL=sqlite:///./test.db
   FRONTEND_ORIGIN=http://localhost:3001
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

6. **Start server**:
   ```bash
   python start_fastapi.py
   ```

### Backend Setup (Node.js - Alternative)

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (create `.env`):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=password
   DB_NAME=mavericks
   JWT_SECRET=your-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   FRONTEND_ORIGIN=http://localhost:3001
   ```

4. **Start server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API endpoint** (create `.env`):
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```

4. **Start development server**:
   ```bash
   PORT=3001 npm start
   ```

### Access Points
- **Frontend Application**: http://localhost:3001
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Node.js Backend**: http://localhost:5000 (if using alternative)

## Technology Stack

### Frontend
- **Framework**: React 19.1.1
- **Routing**: React Router Dom 7.8.2
- **HTTP Client**: Axios 1.11.0
- **UI Library**: Lucide React (icons)
- **Styling**: Tailwind CSS 3.4.17
- **Testing**: React Testing Library

### Backend (FastAPI)
- **Framework**: FastAPI
- **Language**: Python 3.8+
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Authentication**: JWT with PyJWT
- **Password Hashing**: Passlib with bcrypt
- **Database**: SQLite (development), MySQL (production)
- **Server**: Uvicorn

### Backend (Node.js - Alternative)
- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.21.2
- **Database**: MySQL2 3.14.4
- **Authentication**: JsonWebToken 9.0.2
- **Password Hashing**: bcrypt 5.1.1
- **Validation**: Joi 18.0.1
- **Security**: Helmet 8.1.0, CORS 2.8.5

### Database
- **Primary**: MySQL 8.0+
- **Development**: SQLite 3.x
- **Schema Management**: SQL migration scripts

### Development Tools
- **Package Manager**: npm (frontend), pip (backend)
- **Process Manager**: nodemon (Node.js), uvicorn --reload (FastAPI)
- **Environment**: dotenv for configuration
- **Version Control**: Git

### External Integrations
- **AI Analytics**: Streamlit application
- **Deployment**: Ready for containerization with Docker
- **Monitoring**: Structured logging with Morgan/FastAPI logging

This comprehensive documentation covers the complete working of the FinPlanAI codebase, from high-level architecture to implementation details, data flow, and development setup procedures.