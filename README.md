## ISI React App 1

Ticket management demo with Google login, Postgres persistence, basic monitoring (Prometheus/Grafana), and optional ELK + Telegram alerts.

### Runtime Stack
- **Frontend**: React + Vite (`client/`), built into Nginx for Docker (`client/Dockerfile`)
- **Backend**: Node.js + Express (`server/`), Passport Google OAuth, sessions, Postgres (`pg`)
- **DB**: PostgreSQL 15
- **Observability**: Prometheus `/metrics`, Grafana, optional ELK (Elasticsearch/Logstash/Kibana)
- **CI/CD**: GitHub Actions CI + GitHub Pages deploy; optional SonarQube analysis via self-hosted runner

### Quickstart (Local Dev, ~5 min)
1) Install deps
- `npm i`
- `cd client; npm i`
- `cd server; npm i`

2) Configure env
- Copy `server/.env.example` to `server/.env.local` and fill values (especially `SESSION_SECRET`, Google OAuth)
- Copy `client/.env.example` to `client/.env.local` and set `VITE_API_BASE_URL`

3) Run Postgres (Docker)
- `docker compose up -d db`

4) Run backend + frontend
- `cd server; npm run start:local`
- `cd client; npm run dev`

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

### Docker Compose (Full Stack)
1) Copy `.env.example` to `.env` and fill values
2) `docker compose up --build`
3) Frontend: `http://localhost:3000` (Nginx), Backend: `http://localhost:5000`

### Environment Variables
- **Client**
  - `VITE_API_BASE_URL`: backend base URL (default used in code is `http://localhost:5000`)
  - `VITE_BASE`: build base path (set to `/<repo-name>/` for GitHub Pages)
- **Server**
  - `PORT`, `NODE_ENV`, `SESSION_SECRET`
  - `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`, `DB_PORT`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - `CLIENT_ORIGIN`, `CORS_ORIGINS`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (optional)
  - `ENABLE_LOGSTASH`, `LOGSTASH_HOST`, `LOGSTASH_PORT`, `ELASTIC_URL` (optional)

### Notes (Repo Hygiene)
- Do **not** commit `.env*` files with secrets; use the provided examples instead.
- Terraform state (`infra/terraform.tfstate*`) should not be committed.

## Environment setup (secrets moved out of git)
1) Server env: copy `server/.env.example` to `server/.env`, then fill in values for Google OAuth, Telegram, and a random `SESSION_SECRET`. Defaults target a local PostgreSQL on `localhost`; `docker compose` overrides `DB_HOST` to `db` for the container automatically.
2) Client env: copy `client/.env.example` to `client/.env` and set `VITE_API_BASE_URL` if the backend is not on `http://localhost:5000`.
3) Docker: `docker-compose` reads the database credentials from your shell/.env values; ensure `DB_PASSWORD`/`POSTGRES_PASSWORD` match between the backend and database.

## Running locally
- Docker: `docker compose up --build` (ensure the env files above exist first).
- Backend only: `cd server && npm install && npm start` (requires PostgreSQL reachable using the `DB_*` vars).
- Frontend only: `cd client && npm install && npm run dev`.

## Rotation checklist
- Google OAuth client ID and client secret.
- Express `SESSION_SECRET`.
- Database/PostgreSQL user/password.
- Telegram bot token and chat ID.
- Any other tokens or keys you place in `server/.env` or `client/.env`.
