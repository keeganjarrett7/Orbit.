# Orbit — NextPlay Kanban Assessment

A responsive, full-stack Kanban board built with React, TypeScript, dnd-kit, and Supabase.

## Features
- Four draggable task statuses: To Do, In Progress, In Review, Done
- Create, edit, and delete tasks
- Priority levels, due dates, and overdue indicators
- Search and priority filtering
- Summary metrics and completion progress
- Supabase anonymous authentication with per-user Row Level Security
- Persisted task data and visible loading/error states

## Local setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Create a Supabase project at https://supabase.com.
4. In **Authentication → Providers**, enable **Anonymous Sign-ins**.
5. In **SQL Editor**, execute `supabase/schema.sql` once on a fresh project.
6. Copy `.env.example` to `.env` and replace the placeholders with your Supabase project URL and **public/publishable anon key**. Never put a service-role or secret key in the frontend.
7. Run `npm run dev` and open the printed local URL.
8. Run `npm run build` to check the production build.

## Deployment
Import the GitHub repository into Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables, and deploy. Vercel should detect Vite; build command `npm run build`, output directory `dist`.

## Manual acceptance tests
- Open in a private browser window: a guest session is created without credentials.
- Create a task; refresh; it remains visible.
- Move it to another column; refresh; its new status persists.
- Edit its title, priority, and due date; refresh; changes persist.
- Search and filter tasks; reset filters; all tasks return.
- Delete a task and refresh; it remains deleted.
- Open in a different private window/browser: tasks from the first session are NOT visible.
- Resize to mobile: layout is usable and tasks can be moved using touch.
- Disconnect the network and attempt to save: an error is displayed.

## Submission notes
The original assessment document is confidential and must not be published. The final assessment document should include the live URL, repository URL, schema, local setup instructions, advanced features, design choices, and tradeoffs. The working demo can be listed on a resume.
