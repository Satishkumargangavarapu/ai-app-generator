# AI App Generator System

I've built the complete, production-grade AI App Generator system for your assignment in `e:\some\ai-app-generator`.

## Core Features Implemented

1. **Dynamic Application Runtime**: Built with Next.js App Router. Uses dynamic catch-all routes to interpret the JSON configuration and automatically map them to UI (`DynamicTable`, `DynamicForm`) and Backend APIs.
2. **PostgreSQL Database Engine**: Uses `node-postgres` (`pg`) to connect to your database. It uses an ultra-flexible `dynamic_records` table with a `JSONB` column. This intelligently handles the "schema mismatches" and "optional fields" requirements out-of-the-box by avoiding error-prone `ALTER TABLE` queries during runtime.
3. **Frontend Application**: React Server and Client Components render dynamically based on the configuration. Form fields, table headers, and inputs adapt according to the parsed configuration.
4. **Complete CRUD**: Generated model APIs support create, read, update, delete, and CSV import.
5. **CSV Import System**: A fully integrated feature that allows batch uploading CSV files. The CSV is parsed via `papaparse` on the server and directly mapped into the dynamic records system.
6. **Authentication & User Scoping**: A custom JWT authentication system. Users can register and sign in. If an App Config sets `"auth": { "required": true }`, then records in the dynamic tables are strictly tied to the logged-in user (`owner_id` logic on all CRUD).
7. **Mobile-Ready + PWA**: The system is responsive and includes installable PWA metadata.
8. **Localization**: Config-defined locale labels can be switched at runtime in generated apps.
9. **Notifications**: Config-defined event notifications trigger on record create, update, delete, and CSV import. Mock email delivery is recorded when enabled.
10. **Dynamic Dashboards**: Dashboard views render live count and recent-record widgets from generated APIs.

## Architecture

```mermaid
graph TD
    A[JSON Configuration] --> B[Zod Schema Validator]
    B --> C[Next.js App Runtime]
    
    subgraph "Dynamic Catch-all Routes"
    C --> D[/app/appId/...viewPath]
    C --> E[/api/apps/appId/model]
    end
    
    D --> F[DynamicTable Component]
    D --> G[DynamicForm Component]
    
    E --> H[(PostgreSQL)]
    
    I[CSV Import Route] --> H
    J[Auth JWT System] --> E
```

## How to Test

1. Add your Postgres database credentials to `e:\some\ai-app-generator\.env.example` and rename to `.env`.
2. Run `npm install` and start the server `npm run dev`.
3. Visit `http://localhost:3000/api/setup` to automatically initialize the PostgreSQL schema.
4. Navigate to `http://localhost:3000` to interact with your generator system.

> [!TIP]
> **Extensibility**
> To add new UI components (like a Dashboard), you only need to create a new React component and add it to the switch block in `src/app/[appId]/[[...viewPath]]/page.tsx`. The rest of the architecture naturally scales.

## Submission Checklist

- Push this repository to GitHub.
- Deploy to Vercel, Render, Railway, or another Node-compatible host with PostgreSQL.
- Configure `DATABASE_URL` and `JWT_SECRET` on the host.
- Record a Loom covering architecture, config repair, JSONB storage, dynamic APIs, user scoping, localization, notifications, CSV import, and deployment tradeoffs.
