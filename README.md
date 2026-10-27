# Found. — Campus Lost, Found & Trade Board

Found. is a full-stack, production-quality web application built with the **MERN** stack (MongoDB, Express, React, Node.js with ES modules) and **Tailwind CSS**. It is designed specifically for college campuses as a digital noticeboard where students report lost gear, post found belongings, and list textbooks or supplies to trade.

---

## Key Features & Privacy Architecture

- **Campus Noticeboard Aesthetic**: Editorial design with warm paper background (`#F1EFE6`), deep ink typography (`#1F2A24`), moss green buttons (`#3F5F4D`), and distinctive color-coded notice borders (Mustard for **LOST**, Teal for **FOUND**, Plum for **TRADE**). Headings styled with **Fraunces** and body text in **IBM Plex Sans**.
- **Contact Privacy Guarantee**: To prevent spam and harassment, phone numbers and emails are never displayed publicly. Contact details are unlocked only after a verified student submits an inquiry message.
- **Private Verification Hints**: Authors of lost/found items record a secret detail (e.g. "small dent on rim", "scratched initials") visible only to them when logged in, used to verify ownership before meeting.
- **Finder Reputation System**: Finder students earn +10 points when returning a found item. Points are displayed on an Honor Roll leaderboard and an interactive navbar badge. An atomic database lock prevents double payouts.
- **Smart Opposite-Type Matching**: Lost posts automatically query and surface matching active Found items (and vice-versa) based on title keywords.
- **Automated Lifecycle Sweeper**: Posts auto-expire after 30 days. Authors can renew them for an additional 30 days.
- **Production-Ready Security**: Helmet headers, NoSQL operator sanitization, rate limiters, bcrypt hashing, 10-digit Indian phone normalization, and 6-digit email verification with lockout protection.

---

## Directory Structure

```text
SE project/
├── backend/
│   ├── config/
│   │   └── db.js                 # Mongoose connection manager
│   ├── controllers/
│   │   ├── authController.js     # Signup, verify, login, profile, password, deletion
│   │   ├── postController.js     # CRUD, opposite-type matching, renew, resolve
│   │   ├── interestController.js # Inquiries and contact disclosure
│   │   ├── reportController.js   # Community violation reports
│   │   ├── adminController.js    # Moderation of posts, users, reports
│   │   └── leaderboardController.js # Leaderboard and health ping
│   ├── middleware/
│   │   ├── auth.js               # protect, optionalAuth, adminOnly
│   │   ├── errorHandler.js       # JSON parser & global exception handler
│   │   ├── rateLimiter.js        # Express rate limiters (API, auth, creations)
│   │   └── validateObjectId.js   # 24-char hex MongoDB ID guard
│   ├── models/
│   │   ├── User.js               # User schema with roles, phone, points
│   │   ├── Post.js               # Post schema with status index
│   │   ├── Interest.js           # Unique compound index post + student
│   │   ├── Report.js             # Unique compound index post + reporter
│   │   └── PointAward.js         # Unique index on post (double payout lock)
│   ├── routes/                   # Modular Express routers
│   ├── utils/
│   │   ├── archiveJob.js         # 6-hourly auto-archive sweeper
│   │   ├── phone.js              # Indian phone normalizer (+91, 91, 0)
│   │   ├── respond.js            # Safe server error responder
│   │   └── sendEmail.js          # Brevo HTTPS API, Gmail SMTP, console fallback
│   ├── tests/
│   │   ├── api.test.js           # Comprehensive supertest API test suite
│   │   └── phone.test.js         # Indian mobile phone unit tests
│   ├── app.js                    # Express app definition (no listen)
│   ├── server.js                 # Server entrypoint with env checks & cron
│   ├── seed.js                   # Development database seeder
│   ├── createAdmin.js            # CLI script to create or promote admins
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, Footer, Toast, ErrorBoundary, Cards
│   │   ├── pages/                # Browse, PostDetail, CreatePost, MyPosts, Admin, Profile, Auth
│   │   ├── api.js                # Axios client with JWT interceptor & event bus
│   │   ├── App.jsx               # React Router routes & ProtectedRoute guards
│   │   ├── index.css             # Tailwind base & custom noticeboard styles
│   │   └── main.jsx
│   ├── tests/                    # Vitest component & page unit tests
│   ├── index.html                # Google fonts & emoji favicon
│   ├── vercel.json               # SPA routing rewrite for deep links
│   └── vite.config.js
│
├── README.md
├── EMAIL_SETUP.md
├── TESTING.md
├── DEPLOY.md
└── .gitignore
```

---

## Local Setup & Installation (Windows)

Prerequisites:
- [Node.js](https://nodejs.org/) v18+ (tested on v24)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free M0 cluster OR local MongoDB server

### 1. Clone & Enter Directory
Open PowerShell or Windows Command Prompt:
```powershell
cd "c:\Users\Test\Desktop\anti projects\SE project"
```

### 2. Backend Setup
```powershell
cd backend
npm install
```

Create `.env` inside `backend/` (refer to `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/found_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_found_jwt_key_2026_production
FRONTEND_URL=http://localhost:5173

# Optional: Brevo API Key (or leave blank to use console email logging in development)
BREVO_API_KEY=
EMAIL_FROM=found@campus.edu
```

Seed sample users and posts into your database:
```powershell
npm run seed
```
> Populates 3 verified accounts (Arjun, Priya, Admin; password: `password123`) and sample notices.

Create or promote an administrator via CLI:
```powershell
node createAdmin.js "Campus Admin" admin@college.edu 9876543210 AdminSecure123!
```

Start backend development server:
```powershell
npm run dev
```
> Server runs at `http://localhost:5000`

---

### 3. Frontend Setup
In a new PowerShell tab:
```powershell
cd "c:\Users\Test\Desktop\anti projects\SE project\frontend"
npm install
```

Create `.env` inside `frontend/` (refer to `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=found_unsigned_preset
```

Start frontend Vite development server:
```powershell
npm run dev
```
> Open browser at `http://localhost:5173`

---

## Running Automated Tests

### Backend Tests (node:test + supertest)
```powershell
cd backend
npm test
```
- Tests phone normalizer logic.
- Runs 59 integration tests against an isolated test database (or in-memory MongoDB).
- Validates race conditions (5 simultaneous resolve requests paying out points exactly once), privacy leaks, NoSQL injection resistance, and admin protections.

### Frontend Tests (Vitest + React Testing Library)
```powershell
cd frontend
npm test
```
- Runs 13 unit and integration tests with mocked API.
- Tests Browse, PostDetail (visitor vs owner), Signup, Login, Email Verification, Admin, Profile, ErrorBoundary, and resilience against malformed server payloads.

---

## API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/signup` | Public | Register with 10-digit Indian phone & terms agreement |
| `POST` | `/verify-email` | Public | Submit 6-digit code (locks after 5 failures) |
| `POST` | `/resend-code` | Public | Resend code (throttled to 30s) |
| `POST` | `/login` | Public | Email or phone login; sends code if unverified |
| `GET` | `/me` | Protected | Current user profile |
| `PATCH` | `/profile` | Protected | Update name and phone |
| `POST` | `/change-password` | Protected | Verify current & set new password |
| `DELETE` | `/me` | Protected | Delete account with cascade (blocked for admin) |
| `POST` | `/forgot-password` | Public | Send 30-min password reset link |
| `POST` | `/reset-password/:token`| Public | Single-use password reset |

### Notices (`/api/posts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Browse notices with type, category, and search |
| `GET` | `/mine` | Protected | Personal notices including private hints |
| `GET` | `/:id` | Public/Opt | Single notice view, owner detection & match suggestion |
| `POST` | `/` | Protected | Create notice with Cloudinary image validation |
| `PATCH` | `/:id` | Owner/Admin | Edit active notice (type cannot change) |
| `DELETE` | `/:id` | Owner/Admin | Delete notice with cascading inquiries & reports |
| `PATCH` | `/:id/renew` | Owner/Admin | Extend expired notice by 30 days |
| `PATCH` | `/:id/resolve` | Owner/Admin | Mark resolved & award +10 points for found items |

### Inquiries & Reports (`/api/interests` & `/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/interests` | Protected | Inquire on notice; reveals poster contact |
| `GET` | `/interests/post/:postId` | Owner/Admin | View all inquiries with responder contact details |
| `POST` | `/reports` | Protected | Report notice for spam, scam, or inappropriate content |

### Admin Moderation (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/posts` | Admin | View all platform notices |
| `DELETE` | `/posts/:id` | Admin | Force remove notice and associated data |
| `GET` | `/users` | Admin | View registered campus users |
| `GET` | `/reports` | Admin | Inspect open violation reports |
| `PATCH` | `/reports/:id/dismiss` | Admin | Dismiss report |

### Public & Health (`/api/leaderboard` & `/api/health`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/leaderboard` | Public | Top 10 finders by points |
| `GET` | `/leaderboard/stats` | Public | Total resolved/reunited count |
| `GET` | `/health` | Public | Uptime monitoring ping endpoint |
