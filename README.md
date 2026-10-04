# Taskio

Todoist-style task manager. Next.js web app + API on Vercel, Postgres on Neon, Flutter client in [taskio-flutter](https://github.com/ishaanyo/taskio-flutter).

## Features

- Accounts (email + password, JWT)
- Inbox, Today, Upcoming, and custom projects
- Tasks with description, due date, due time, and priority (P1–P4)
- Complete, edit, move between projects, delete
- REST API used by the Flutter app

Priority matches Todoist: API `priority` 4 is P1 (highest), 1 is P4 (lowest).

## Neon

1. Create a Neon project and copy the pooled connection string.
2. Set `DATABASE_URL` (tables are created on the first API request). `schema.sql` is the same DDL.

## Vercel

Environment variables:

- `DATABASE_URL` — Neon connection string (`sslmode=require`)
- `AUTH_SECRET` — long random string

```bash
npm install
npm run dev
```

## API

| Method | Path | Body / query |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | Bearer token |
| GET/POST | `/api/projects` | `{ name, color }` |
| PATCH/DELETE | `/api/projects/:id` | `{ name, color, is_favorite }` |
| GET | `/api/tasks?view=inbox\|today\|upcoming` or `?project_id=` | |
| POST | `/api/tasks` | `{ content, description, project_id, priority, due_date, due_time, parent_id }` |
| PATCH/DELETE | `/api/tasks/:id` | partial task fields, `is_completed` |

`due_date` is `YYYY-MM-DD`. `due_time` is `HH:MM` (optional).
