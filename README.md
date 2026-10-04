# SmartBin Monorepo (Backend + Frontend)

## Project Structure
- `backend/`: FastAPI Python server (Handles business logic, calculations & Supabase DB)
- `frontend-web/`: React (Vite) Web Dashboard (Handles UI, charts & tables)

## How to Run Backend:
1. cd backend
2. .\venv\Scripts\activate (Windows) or source venv/bin/activate (Mac)
3. pip install -r requirements.txt
4. uvicorn main:app --reload
- API Docs: http://localhost:8000/docs

## How to Run Frontend:
1. cd frontend-web
2. npm install
3. npm run dev
- Web App: http://localhost:5173