# Tutor Booking System

A full-stack web application for BAI12153 Web Programming project (May 2026 Semester).
Students can search for tutors and book sessions; tutors can manage their availability
and approve/reject bookings.

## Tech stack
- **Frontend**: EJS + Bootstrap 5
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: Session-based, passwords hashed with bcrypt

> **Note on database choice:** this project was originally developed against
> MySQL/MariaDB (via XAMPP) locally, then migrated to PostgreSQL so it could
> be deployed for free on Render — Render's free managed database tier is
> PostgreSQL only, and free MySQL hosting options are unreliable. Both are
> relational databases accepted by the project brief; the schema and queries
> were ported with no change in functionality.

## Project status
✅ Day 6 of 8 — all core features complete: authentication, tutor profile
management, booking CRUD, search/filter, dashboards, and security hardening.
Report writing, wireframe finalization, and demo video remain.

## Security measures implemented
- Passwords hashed with **bcrypt** (never stored in plain text)
- **Server-side validation** on all forms via `express-validator`
- **Client-side validation** via HTML5 form attributes (`required`, `type`, `minlength`, etc.)
- **Role-based access control** — `isLoggedIn` and `isRole()` middleware protect every
  `/student/*` and `/tutor/*` route
- **SQL injection protection** — all database queries use parameterized statements (`$1, $2, ...` placeholders) via `pg`
- **XSS protection** — EJS auto-escapes all dynamic output by default (`<%= %>`)
- **CSRF protection** — custom session-based token middleware (`middleware/csrf.js`)
  validates a hidden `_csrf` field on every state-changing form submission
- Sensitive config (DB credentials, session secret) kept out of source control via `.env` + `.gitignore`

## Test credentials
*(Register your own accounts via `/register` — one with role "student" and one
with role "tutor" — then log in to test both dashboards.)*

Example:
| Role | Email | Password |
|---|---|---|
| Student | student@test.com | test1234 |
| Tutor | tutor@test.com | test1234 |

## Bonus features implemented
- **Email notifications** — students get a confirmation email when they submit
  a booking request, tutors get notified of new requests, and students get
  notified when their booking is approved or rejected. See `utils/mailer.js`.
  Works out of the box in "test mode" (prints a preview link to the terminal)
  or with real Gmail credentials if `EMAIL_USER` / `EMAIL_PASS` are set in `.env`.

## Setup instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd tutor-booking-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Make sure PostgreSQL is running locally (e.g. via Postgres.app on Mac,
     or `brew install postgresql`)
   - Create the database, then run the schema file to create the tables:
     ```bash
     createdb tutor_booking
     psql -d tutor_booking -f database.sql
     ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your PostgreSQL credentials and a session secret:
     ```bash
     cp .env.example .env
     ```

5. **Run the server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` in your browser.

## Database schema
See `database.sql` for full table definitions. Summary:
- `users` — stores both students and tutors, differentiated by `role`
- `tutor_profiles` — subject, bio, hourly rate (one-to-one with a tutor user)
- `bookings` — links a student and a tutor, tracks status (pending/approved/rejected/cancelled)

## Project structure
```
tutor-booking-system/
├── config/          # database connection
├── controllers/     # request handling logic
├── middleware/      # auth/role-checking/CSRF middleware
├── models/          # DB query helpers
├── routes/          # route definitions
├── views/           # EJS templates
├── public/          # static css/js/images
├── database.sql     # table schema
└── app.js           # entry point
```
