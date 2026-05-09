# AI App Generator

A config-driven mini app generator inspired by Base44. It reads imperfect JSON configuration and turns it into a working web app with dynamic React views, Node/Next APIs, PostgreSQL persistence, authentication, CSV import, localization, notifications, dashboards, and PWA metadata.

## What Is Implemented

- Dynamic runtime: JSON config is normalized and repaired before rendering.
- Frontend: generated forms, tables, dashboards, loading states, error states, mobile layouts, and language switching.
- Backend: dynamic model APIs with create, read, update, delete, CSV import, validation, and error handling.
- Database: PostgreSQL with resilient JSONB records to handle optional fields and schema changes.
- Authentication: email/password auth with JWT HTTP-only cookies, password strength checks, lockout handling, and user-scoped records.
- Extensibility: UI components are isolated (`DynamicForm`, `DynamicTable`, `DynamicDashboard`) and config parsing is centralized.

## Mandatory Feature Set

The system includes more than three integrated platform capabilities:

- Mobile-ready responsive apps.
- CSV import system: upload CSV, validate/map rows, store them, and render records.
- Multi-language localization: config-defined locales and runtime language switching.
- Event notifications: config-defined triggers for create, update, delete, and CSV import, with mock transactional email status.
- PWA/installable metadata: web manifest, app icon, and production service worker.

## Local Setup

1. Create `.env` from `.env.example`.

```bash
DATABASE_URL="postgres://user:password@localhost:5432/ai_app_generator"
JWT_SECRET="replace-with-a-long-random-secret"
SETUP_TOKEN="optional-production-setup-token"
```

2. Install and run.

```bash
npm install
npm run dev
```

3. Initialize the database in development.

```bash
http://localhost:3000/api/setup
```

4. Open the app.

```bash
http://localhost:3000
```

## Example Config

```json
{
  "name": "Employee Directory",
  "auth": { "required": true },
  "localization": {
    "defaultLocale": "en",
    "locales": {
      "en": { "save": "Save", "import_csv": "Import CSV" },
      "hi": { "save": "सेव करें", "import_csv": "CSV आयात करें" }
    }
  },
  "notifications": {
    "enabled": true,
    "events": ["record.created", "record.updated", "record.deleted", "csv.imported"],
    "mockEmail": true
  },
  "models": {
    "employees": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "department", "type": "string" },
        { "name": "salary", "type": "number" },
        { "name": "is_active", "type": "boolean" }
      ]
    }
  },
  "views": [
    {
      "type": "dashboard",
      "model": "employees",
      "title": "Employee Dashboard",
      "path": "/",
      "widgets": [
        { "type": "count", "title": "Total Employees" },
        { "type": "recent", "title": "Recent Employees" }
      ]
    },
    { "type": "table", "model": "employees", "title": "Employees", "path": "/employees" }
  ]
}
```

## Verification

```bash
npm test
npm run lint
npm run build
```

Current local verification: 41 tests passing, lint passing, production build passing.

## Deployment

Deploy the Next.js app to Vercel, Render, Railway, or another Node-compatible host with PostgreSQL. Set these environment variables in the host:

- `DATABASE_URL`
- `JWT_SECRET`
- `SETUP_TOKEN` if you want to initialize the database through `/api/setup` in production.

For production, initialize the database from a trusted setup request:

```bash
curl -H "x-setup-token: your-token" https://your-domain.com/api/setup
```

Without `SETUP_TOKEN`, `/api/setup` and `/api/init` return 404 in production.
