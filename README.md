# MedBuddy - Intelligent Prescription Management Platform

## Quick Start

### Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/
- API Docs: http://localhost:8000/api/docs/

## Environment Setup
1. Copy `backend/.env.example` to `backend/.env`
2. Add your Azure credentials
3. Create PostgreSQL database

## Tech Stack
- Backend: Django REST Framework, PostgreSQL
- Frontend: React.js, Tailwind CSS, Vite
- AI: Azure AI Vision, Azure OpenAI GPT-4o
- Storage: Azure Blob Storage
