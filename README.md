# TripSync

**Plan Together. Split Fairly. Remember Everything.**

A collaborative travel expense and memory workspace — full-stack web application.

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, React Router v6, Zustand, Recharts
- **Backend:** Python + Flask, MongoDB + PyMongo, JWT Auth, Cloudinary
- **Validation:** Marshmallow schemas

## Project Structure

```
project/
├── backend/
│   ├── config/          # Settings, database, cloudinary config
│   ├── middleware/       # Auth, rate limiter, logger, error handler
│   ├── models/           # Marshmallow schemas for validation
│   ├── routes/           # Flask blueprints (REST API endpoints)
│   ├── services/         # Business logic layer
│   ├── app.py            # Flask application factory
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios API client and endpoint modules
│   │   ├── components/   # UI components organized by feature
│   │   ├── pages/        # Page-level components
│   │   ├── stores/       # Zustand state management
│   │   └── App.jsx       # Root component with routing
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Features

- **Auth:** JWT-based (access + refresh tokens), bcrypt password hashing
- **Trips:** CRUD, invite codes, member management with roles
- **Expenses:** Add/edit/delete, equal or custom split, category filtering
- **Settlements:** Debt minimization algorithm, pay/confirm flow
- **Budget:** Total vs spent analytics, per-category breakdown, daily trends
- **Memories:** Photo/video grid upload with captions and tags
- **Itinerary:** Day-by-day timeline, typed items with times and locations
- **Notifications:** Slide-in drawer with unread count
- **Comments:** Threaded comments on expenses, memories, itinerary items
- **Activity Feed:** Real-time trip activity tracking

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Configure environment variables in instance/.env
# Then run:
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and proxies API requests to http://localhost:5000.

## API Documentation

All endpoints return a consistent envelope:
```json
{ "success": true, "data": {}, "message": "..." }
```
Error responses:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": {} } }
```

See the route files in `backend/routes/` for the full API specification.

## Environment Variables

See `backend/instance/.env` for all required variables.
