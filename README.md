# Femmoirs

Anonymous posting app with:

- public story feed
- direct reporting to moderation
- admin moderation UI for hide/restore
- Go backend + Postgres + React frontend

## What Was Added For Deployment

The repo now includes the minimum production scaffolding needed to ship the app as one service:

- root [Dockerfile](./Dockerfile) to build the frontend and backend together
- root [.dockerignore](./.dockerignore)
- Railway-friendly `PORT` handling in [backend/cmd/api/main.go](./backend/cmd/api/main.go)
- database bootstrap SQL in [backend/schema.sql](./backend/schema.sql)
- backend env example in [backend/.env.example](./backend/.env.example)
- health check at `/healthz`

That means the app can run as a single containerized web service with one Postgres database.

## Recommended Production Setup

Recommended stack:

- app hosting: Railway
- database: Railway Postgres
- domain DNS: Squarespace
- moderation email: personal Gmail with app password to start

This is the simplest setup for the current architecture because the app expects a real backend, database, admin secret, and SMTP credentials.

## Railway Deployment Runbook

### 1. Push this repo to GitHub

Make sure Railway can access the latest version of the codebase.

### 2. Create a Railway project

In Railway:

1. Create a new project from the GitHub repo.
2. Add a PostgreSQL service.
3. Add a web service from the same repo root.

Railway should detect and use the root [Dockerfile](./Dockerfile).

### 3. Set web service environment variables

Use [backend/.env.example](./backend/.env.example) as the template.

Required variables:

- `DATABASE_URL`
- `ADMIN_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `MODERATION_FROM_EMAIL`
- `MODERATION_TO_EMAIL`

Notes:

- `PORT` is provided by Railway automatically.
- Railway Postgres usually exposes a `DATABASE_URL` you can reference directly in the web service.
- `ADMIN_SECRET` should be long and random.

### 4. Recommended Gmail SMTP values

If you want the cheapest working moderation email setup right now, use your personal Gmail with a Google app password:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=yourname@gmail.com`
- `SMTP_PASSWORD=your-16-digit-app-password`
- `MODERATION_FROM_EMAIL=yourname@gmail.com`
- `MODERATION_TO_EMAIL=yourname@gmail.com`

### 5. Initialize the production database

Before the app can work on a brand-new Railway Postgres instance, run the schema file once:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

This creates:

- `posts`
- `post_votes`

### 6. Deploy and verify the Railway URL

In the Railway web service:

1. Deploy the app.
2. Generate a Railway public domain in `Networking`.
3. Open the site and verify:
   - `/healthz`
   - `/`
   - `/contact`
   - `/admin`

You should also test:

- create a post
- vote on a post
- report a post through the contact flow
- unlock `/admin` and hide/restore a post

## Connect `femmoirs.com` From Squarespace

Once the Railway domain works:

1. In Railway, add `www.femmoirs.com` as a custom domain.
2. Copy the CNAME target Railway gives you.
3. In Squarespace DNS settings, create a `CNAME` for `www` pointing to that Railway target.

If you also want the apex domain:

1. Add `femmoirs.com` in Railway too.
2. In Squarespace DNS settings, add an `ALIAS` record for `@` pointing to the Railway target if Squarespace allows it in your current DNS mode.

Wait for Railway to verify the domain and issue SSL.

## Production Checklist

Before sharing the site publicly:

- confirm `https://www.femmoirs.com` loads
- confirm `https://femmoirs.com` loads if you point the apex domain too
- confirm `/healthz` returns `ok`
- create a live post
- vote on it from a clean browser
- report it through `/contact`
- confirm the report lands in your inbox
- open `/admin`
- hide the post
- verify it disappears from the public feed
- restore the post and verify it returns

## Local Notes

- frontend dev server lives in `frontend`
- backend server lives in `backend`
- local Postgres helper: [backend/docker-compose.yaml](./backend/docker-compose.yaml)

Useful local command examples:

```bash
cd backend
docker compose up -d
go run ./cmd/api
```

```bash
cd frontend
npm run dev
```
