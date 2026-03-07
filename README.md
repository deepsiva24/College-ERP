# School/College ERP System

A comprehensive ERP (Enterprise Resource Planning) application built for schools and colleges. The application provides both web and mobile-compatible interfaces to manage various educational institute operations.

## Technology Stack

The project adopts a modern and scalable tech stack:

- **Frontend:** React (TypeScript), styled with Tailwind CSS.
- **Backend:** Python with FastAPI.
- **Future Mobile App Migration:** The codebase architecture is structured and decoupled specifically to allow easy future migration to Dart/Flutter for native mobile application delivery.

## Project Structure

The repository is organized into two main workspaces:

- `/frontend/` - Contains the React web application code.
- `/backend/` - Contains the FastAPI Python backend services, database models, and API endpoints.

## Getting Started

### Prerequisites

- Node.js (for the frontend React application)
- Python 3.9+ (for the FastAPI backend)

### Running the Backend (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows
   .\venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will be available at `http://localhost:8000`. You can access the API documentation at `http://localhost:8000/docs`.

### Running the Frontend (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   # OR depending on your setup
   npm start
   ```
   The web application will be accessible at `http://localhost:5173` (or `http://localhost:3000` depending on the bundler used).

## Contributing

When contributing to this project, ensure that the decoupling between the frontend and backend is maintained and that any new API endpoints are well-documented to assist with the future Dart mobile app migration.

## Client Database Initialization

The multitenant architecture strictly requires clients (tenants) to be initialized before use. Automatic database schema creation is disabled for safety.

To add a new client or initialize their database:
1. Add the client's name and initial admin password to the `client_config.yaml` file in the root directory.
2. Open a secure SSH tunnel to the production database (leave this running):
   ```bash
   gcloud compute ssh school-erp-db --project=rosy-hope-489506-p3 --zone=us-central1-a --tunnel-through-iap -- -L 5432:localhost:5432
   ```
3. Run the initialization script locally from the `backend` folder:
   ```powershell
   cd backend
   $env:DATABASE_URL="postgresql://postgres:erp-secure-production-db-password-2026@localhost:5432/postgres"
   venv\Scripts\python.exe init_clients.py
   ```

This script safely generates the separated PostgreSQL schema (e.g., `tenant_prahithaedu`), creates all required tables inside it, and populates the first Admin User using the configured password.
