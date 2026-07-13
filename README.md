# DeepWork

DeepWork is a local full-stack focus and productivity tracker. Users can register, log in, record focused work, set a daily goal, and review their sessions in a calendar.

## Current architecture

- Frontend: vanilla HTML, CSS utilities, and JavaScript, served locally with VS Code Live Server.
- Backend: FastAPI application at `backend/app/main.py` (`app.main:app`).
- Data: PostgreSQL via SQLAlchemy.
- Authentication: password hashing with `pwdlib` and JWT Bearer tokens with PyJWT.

The frontend pages are `auth.html`, `calendar.html`, and `focus-timer.html`. The API client is `js/api.js`; its sole backend origin is configured in `js/config.js`.

## Prerequisites

- Python 3.11 or newer
- PostgreSQL running locally
- VS Code with the Live Server extension (or another static-file server)

Create a PostgreSQL database named `deepwork` before starting the API.

## Environment configuration

Copy `backend/.env.example` to `backend/.env`, then replace the placeholder values. `backend/.env` is local-only and is ignored by Git; do not commit database passwords or JWT secrets.

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/deepwork
JWT_SECRET_KEY=replace-with-a-long-random-secret-at-least-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501
```

For deployment, supply the same values through the host's environment-variable configuration instead of a `.env` file.

`ALLOWED_ORIGINS` is a comma-separated list of explicit frontend origins. The default local Live Server origins are retained if the variable is omitted. Wildcard origins are intentionally rejected because DeepWork permits credentialed authenticated requests.

## Local backend setup

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Confirm the API is running at `http://127.0.0.1:8000/health`; it returns `{"status":"ok"}`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Local frontend setup

Open the project root in VS Code and use Live Server to serve `index.html`. The page routes users to sign-in or the calendar. Ensure its origin is listed in `ALLOWED_ORIGINS` (ports 5500 and 5501 are included for the existing setup).

The frontend API origin is centralized in `js/config.js`:

```js
API_BASE_URL: "http://127.0.0.1:8000"
```

When a production API is available, change this one value to its public HTTPS origin. Do not add an API path or trailing slash.

## Production preparation

No deployment or PWA conversion has been performed. The project is prepared for the next deployment phase with:

- environment-backed database, JWT, and CORS configuration;
- safe example environment values and Git ignore rules for secrets and generated files;
- explicit credential-safe CORS origins; and
- a centralized frontend API origin.

The verified FastAPI entry point is `app.main:app`. A production process should run without reload, for example:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use the deployment platform's assigned port if it provides one. Configure the production frontend origin in `ALLOWED_ORIGINS` and the production API origin in `js/config.js` during deployment.

## Current scope and limitations

DeepWork retains its existing registration, login, JWT authentication, logout, focus timer persistence, PostgreSQL session storage, calendar, goal, navigation, and session deletion behavior. It is not deployed and is not yet a Progressive Web App.
