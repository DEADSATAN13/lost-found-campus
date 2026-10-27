# Testing Documentation for Found.

Found. features end-to-end automated test coverage across both the Express backend and the React frontend.

---

## 1. Backend Integration Tests (`backend/tests/`)

Backend tests use Node.js's native test runner (`node:test`) and assertion library (`node:assert/strict`) combined with `supertest`.

### Test Runner Command:
```powershell
cd backend
npm test
```
*Executes:* `cross-env NODE_ENV=test node --test --test-concurrency=1 tests/api.test.js tests/phone.test.js`

### Database Isolation Guardrail:
To prevent accidental data loss on staging or production clusters, `backend/tests/api.test.js` executes strict guardrails:
1. **Name Check**: If `MONGO_URI_TEST` is specified, the database name **must contain `"test"`**; otherwise the test runner terminates immediately:
   ```javascript
   if (!process.env.MONGO_URI_TEST.toLowerCase().includes('test')) {
     throw new Error('Refusing to run tests: MONGO_URI_TEST database name must contain "test"');
   }
   ```
2. **Zero-Config In-Memory Fallback**: If `MONGO_URI_TEST` is undefined, `mongodb-memory-server` spins up a dedicated in-memory MongoDB instance named `found_test`, wipes it cleanly before test execution, and tears it down after tests complete.

### Key Scenarios Covered:
- **Phone Normalization (`tests/phone.test.js`)**: Validates Indian 10-digit mobile numbers with `+91`, `91`, `0` prefixes, dashes, spaces, and brackets. Rejects invalid leading digits (1–5) and bad lengths.
- **Signup Validation & Consent**: Blocks registration when terms agreement is false, rejects invalid phone numbers, verifies 6-digit code dispatch, and confirms user is not logged in prematurely.
- **Code Flow & 5-Attempt Lockout**: Tests incorrect code attempts, locks the account after 5 failed tries with HTTP 403, and enforces a 30-second cooldown on `/api/auth/resend-code`.
- **Duplicate Account & Overwrite Logic**: Rejects duplicate verified emails and phone numbers; overwrites existing unverified account records so typos do not permanently lock an email address.
- **NoSQL Injection Resistance**: Submits MongoDB operator objects (`{ identifier: { $gt: "" }, password: { $gt: "" } }`) to verify string coercion prevents unauthorized login.
- **Revoked & Deleted User Token Invalidation**: Ensures deleted user JWT tokens immediately return HTTP 401 because the `protect` middleware re-queries the user fresh from the database on every request.
- **Campus Privacy Rules**:
  - `GET /api/posts` (public) verifies `verificationHint`, email, and phone are excluded, and only the poster's first name is returned.
  - `GET /api/posts/:id` verifies the private verification hint is stripped for visitors and shown only to the authentic owner.
- **Concurrent Points Race Condition**:
  Fires 5 simultaneous `PATCH /api/posts/:id/resolve` requests in parallel (`Promise.all`). Asserts that:
  - Exactly 1 request succeeds with status 200.
  - Exactly 1 `PointAward` document is saved in the database.
  - The finder receives exactly +10 points (not +50 points).
- **Smart Title Keyword Matching**: Checks that an active Lost post automatically links to a complementary active Found post sharing keywords of 4+ characters.
- **Auto-Archive & Renew**: Tests background sweeper archiving expired posts, blocks public viewing of archived notices, and allows owner renewal (+30 days).
- **Admin Cascade Deletion**: Asserts deleting a post cleanly cascades and wipes all associated responses (`Interest`) and reports (`Report`).

---

## 2. Frontend Unit & Component Tests (`frontend/tests/`)

Frontend tests use **Vitest**, **jsdom**, and **React Testing Library**.

### Test Runner Command:
```powershell
cd frontend
npm test
```
*Executes:* `vitest run`

### Mocking Strategy:
The `src/api.js` module is mocked with Vitest (`vi.mock('../src/api.js')`). This enables testing page state transitions, form submissions, and network responses in isolation.

### Key Scenarios Covered:
- **`Browse.jsx`**: Validates rendering of search filters, type tabs, active notice cards, and good samaritan leaderboard.
- **`PostDetail.jsx` (Visitor vs Owner)**:
  - Visitor: Ensures `verificationHint` is hidden, displays inquiry form, and checks poster contact unlock upon response submission.
  - Owner: Verifies `verificationHint` banner is rendered, and Edit/Delete controls appear.
- **`Signup.jsx`**: Enforces terms checkbox, validates inputs, and verifies navigation to `/verify-email`.
- **`Login.jsx` & Unverified Redirect**: Tests standard login, plus detects HTTP 403 with `needsVerification: true` and automatically navigates the student to the verification screen.
- **`VerifyEmail.jsx`**: Tests 6-digit input entry, token storage, and resend cooldown timer.
- **`MyPosts.jsx`**: Tests personal notice list, days-left calculation, resolution triggering, and inquiry drawer expansion.
- **`Admin.jsx`**: Tests open violation report moderation, dismissing reports, and cascade removing flagged notices.
- **`Profile.jsx`**: Tests updating student name/phone, password change, and danger zone account deletion.
- **`NotFound.jsx`**: Verifies 404 notice card rendering for invalid URLs.
- **`Navbar.jsx`**: Verifies dynamic auth updates, student first-name display, reputation point pill, and sign out.
- **`ErrorBoundary.jsx`**: Catches intentional component render exceptions and verifies the friendly "Something went wrong" fallback with a "Reload Page" button.
- **Resilience Against Malformed Server Payloads**: Mocks `/posts` returning corrupted non-array payloads (e.g. `{ posts: "malformed" }`) to verify the board never crashes and safely renders the empty state.
