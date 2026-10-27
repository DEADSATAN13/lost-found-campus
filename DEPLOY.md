# Production Deployment Guide for Found.

This guide provides instructions for deploying Found. onto free-tier cloud platforms:
- **Database**: MongoDB Atlas (Free M0 Shared Cluster)
- **Backend**: Render (Web Service Free Tier)
- **Frontend**: Vercel (Hobby Free Tier)
- **Media Storage**: Cloudinary (Free Tier)
- **Email Delivery**: Brevo (Free Tier - 300 emails/day)
- **Uptime Monitoring**: UptimeRobot (Free 5-minute pings)

---

## 1. Separate Production Database (MongoDB Atlas)

Never share development or test database instances with production.

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **M0 Shared Cluster** (Free).
3. Under **Database Access**, create a production database user (e.g. `found_prod_user`) with a strong password.
4. Under **Network Access**, click **Add IP Address** and select **Allow Access from Anywhere (`0.0.0.0/0`)** so Render's dynamic IP addresses can connect.
5. In your cluster view, click **Connect** -> **Drivers** -> **Node.js** and copy the connection URI:
   ```text
   mongodb+srv://found_prod_user:<PASSWORD>@cluster0.abcde.mongodb.net/found_prod?retryWrites=true&w=majority
   ```
   *(Ensure the database name is explicitly `found_prod`, not `test` or `found_test`).*

---

## 2. Locking Down the Cloudinary Preset

To prevent malicious users from uploading arbitrary or oversized files to your Cloudinary account:

1. Log in to [Cloudinary](https://cloudinary.com/).
2. Navigate to **Settings** (gear icon) -> **Upload** tab.
3. Scroll to **Upload presets** and click **Add upload preset**.
4. Configure the preset:
   - **Preset name**: `found_unsigned_preset`
   - **Signing Mode**: `Unsigned`
   - **Folder**: `found_campus_uploads`
5. **Lock Down Media Restrictions**:
   - Under **Upload Control**:
     - Set **Allowed file formats** to: `jpg, jpeg, png, webp`
     - Set **Max file size**: `5000000` bytes (5 MB)
     - Set **Access Mode**: `Public`
   - Under **Media analysis and AI**:
     - Enable automatic format optimization (`f_auto, q_auto`).
6. Click **Save**. Copy your **Cloud name** and **Preset name**.

---

## 3. Backend Deployment (Render)

Render hosts Node.js applications on its free web service tier.

1. Push your repository to GitHub.
2. Log in to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name**: `found-backend`
   - **Region**: Choose the region closest to your campus (e.g., Singapore or Frankfurt).
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Click **Advanced** -> **Add Environment Variable** and configure:

| Variable Name | Production Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (or leave default, Render sets PORT automatically) |
| `MONGO_URI` | `mongodb+srv://found_prod_user:...@cluster0.mongodb.net/found_prod?retryWrites=true&w=majority` |
| `JWT_SECRET` | A secure random string at least 32 characters long |
| `BREVO_API_KEY` | Your Brevo API key (`xkeysib-...`) |
| `EMAIL_FROM` | Your verified Brevo sender email (`found@campus.edu`) |
| `FRONTEND_URL` | Temporary placeholder (e.g. `http://localhost:5173`) until frontend is deployed |

6. Click **Create Web Service**. Wait for the build to finish.
7. Once deployed, copy your Render public URL (e.g. `https://found-backend.onrender.com`).

---

## 4. Frontend Deployment (Vercel)

Vercel provides edge hosting with single-page application routing.

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:

| Variable Name | Value |
|---|---|
| `VITE_API_URL` | `https://found-backend.onrender.com/api` (Render backend URL + `/api`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `found_unsigned_preset` |

5. Click **Deploy**.
6. When deployment finishes, copy your Vercel public URL (e.g. `https://found-campus.vercel.app`).
7. **SPA Routing Note**: The included `vercel.json` file automatically routes all deep links (`/post/:id`, `/my-posts`, etc.) to `/index.html` so client-side page refreshes work properly.

---

## 5. Setting FRONTEND_URL in Render After Deploy

Now that your frontend has a live production URL:
1. Return to your **Render Dashboard** -> `found-backend` -> **Environment**.
2. Update `FRONTEND_URL`:
   ```env
   FRONTEND_URL=https://found-campus.vercel.app
   ```
   *(If you also have custom domains or preview deployments, separate them with commas: `https://found-campus.vercel.app,https://found.yourcollege.edu`).*
3. Render will automatically redeploy the backend with the new CORS origin whitelist.

---

## 6. Provisioning the Initial Campus Admin

Render provides an in-browser SSH / terminal session to run one-off maintenance scripts:

1. In Render, go to your service dashboard and click the **Shell** tab (or connect via Render CLI).
2. Run the `createAdmin.js` script with your administrator credentials:
   ```bash
   node createAdmin.js "Campus Administrator" admin@yourcollege.edu 9876543210 StrongAdminPass2026!
   ```
3. Output should confirm:
   ```text
   [Admin] Created new verified Admin account for "admin@yourcollege.edu".
   ```
4. You can now log in at `https://found-campus.vercel.app/login` using `admin@yourcollege.edu` and access the Moderation Panel at `/admin`.

---

## 7. Preventing Cold Boots: Free UptimeRobot Ping on `/api/health`

Free Render instances automatically go to sleep after 15 minutes of inactivity, causing a 30 to 50-second delay ("cold boot") when the next student visits the board.

To keep your free backend warm and responsive:

1. Register for a free account at [UptimeRobot](https://uptimerobot.com/).
2. Click **Add New Monitor**.
3. Fill in monitor settings:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Found Backend Health Ping`
   - **URL (or IP)**: `https://found-backend.onrender.com/api/health`
   - **Monitoring Interval**: Every `5 minutes` (free plan default)
4. Click **Create Monitor**.
5. UptimeRobot will ping `/api/health` every 5 minutes, preventing Render from spinning down the free web service.

---

## 8. Final Live Verification Checklist

- [ ] Open frontend live URL in an Incognito window.
- [ ] Sign up with a new student email and 10-digit Indian mobile number.
- [ ] Check inbox for 6-digit Brevo verification code and activate account.
- [ ] Post a sample **Found** notice with an image upload to Cloudinary.
- [ ] Post a sample **Lost** notice with matching keywords and confirm the automated match suggestion alert appears.
- [ ] Log out, open the notice as a visitor, and verify the private hint, email, and phone are completely hidden.
- [ ] Log in as a second user, respond to the post, and verify the poster's contact details appear immediately.
- [ ] Log in as the original owner, mark the found item as **Resolved**, and confirm +10 reputation points are awarded to your account.
- [ ] Test the UptimeRobot `/api/health` ping returns HTTP 200 OK:
  ```json
  {"status":"ok","timestamp":"2026-10-19T...","service":"Found. Campus Board API"}
  ```

---

## 9. Honest Limitations of Free Hosting Tiers

While this architecture is 100% cost-free, production operators should be aware of technical boundaries:

| Service | Free Tier Limit | Production Consideration |
|---|---|---|
| **Render Web Service** | 512 MB RAM, spins down after 15m inactivity without pings | Peak campus traffic during exam weeks or orientation may cause CPU throttling. |
| **Render Outbound SMTP** | Ports 25, 465, 587 completely blocked | Standard SMTP is blocked; Brevo HTTPS REST API must be used. |
| **MongoDB Atlas M0** | 512 MB storage, shared vCPU, 500 max connections | Ample for thousands of text notices, but database cannot be used for storing image blobs (Cloudinary handles images). |
| **Cloudinary Free** | 25 monthly credits (~25GB managed storage / bandwidth) | Sufficient for campus notice boards; strict 5MB upload cap prevents credit drain. |
| **Brevo Free** | 300 emails per day | If campus registration exceeds 300 students in a single day, transactional emails will queue until midnight UTC. |
| **Vercel Hobby** | 100 GB bandwidth / month | More than sufficient for static frontend bundles and asset delivery. |
