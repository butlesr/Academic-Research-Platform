# 🚀 Complete Deployment Guide
## Academic Research Platform — From Zero to Live in 1 Hour

**Total Cost: ₹0 to ₹400/month** (fully free for small groups, ~$5/month for always-on)

---

## 📋 What You Need Before Starting

- [ ] A computer with internet
- [ ] A mobile number (for account verifications)
- [ ] Your college email address
- [ ] 45–60 minutes of time

No prior server knowledge required. Every step is explained.

---

## 🗺️ Deployment Architecture (Free Stack)

```
Students/Professors
       │
       ▼
  [Vercel] ← Frontend (Next.js) — FREE forever
       │
       ▼
  [Railway] ← Backend API + Socket.IO — ~$5/month
       │
  ┌────┼────────────────┐
  ▼    ▼                ▼
[Supabase] [MongoDB Atlas] [Upstash Redis]
PostgreSQL   Chat Data      Cache/Sessions
  FREE         FREE           FREE
       │
       ▼
[Cloudflare R2] ← File Storage (thesis, assignments)
     FREE (10GB)
```

---

# STEP 1: Set Up All Free Database Services

## 1A. PostgreSQL — Supabase (Free)

1. Go to **https://supabase.com** → Click **"Start your project"**
2. Sign up with your **Google/GitHub account** (recommended)
3. Click **"New Project"**
   - Organization: Create one with your college name
   - Project Name: `academic-platform`
   - Database Password: Create a **strong password** (save it!)
   - Region: **Singapore** (closest to India)
   - Click **"Create new project"** (takes 2 minutes)

4. After creation, go to **Settings → Database**
5. Scroll to **"Connection string"** → Select **"URI"**
6. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
7. Save this — you'll need it later

8. **Run the database schema:**
   - In Supabase dashboard, click **"SQL Editor"** (left sidebar)
   - Click **"New query"**
   - Open the file: `academic-platform/database/schema.sql`
   - Copy ALL the content and paste it into the SQL Editor
   - Click **"Run"** (the green button)
   - You should see "Success. No rows returned"

---

## 1B. MongoDB — MongoDB Atlas (Free)

1. Go to **https://cloud.mongodb.com** → Click **"Try Free"**
2. Sign up with your email
3. Click **"Build a Database"** → Choose **"FREE (M0 Shared)"**
4. Cloud Provider: **AWS**, Region: **Mumbai (ap-south-1)**
5. Cluster Name: `academic-chat` → Click **"Create"**

6. **Security setup:**
   - Username: `academicadmin`
   - Password: Create a strong password (save it!)
   - Click **"Create User"**

7. **Network access:**
   - Click **"Add IP Address"** → **"Allow Access from Anywhere"** → **"Confirm"**

8. Click **"Connect"** → **"Connect your application"**
9. Copy the connection string — looks like:
   ```
   mongodb+srv://academicadmin:[password]@academic-chat.xxxxx.mongodb.net/academic_chat
   ```
   Replace `[password]` with your actual password
10. Save this string

---

## 1C. Redis — Upstash (Free)

1. Go to **https://upstash.com** → **"Start for Free"**
2. Sign up with Google
3. Click **"Create Database"**
   - Name: `academic-redis`
   - Type: **Regional**
   - Region: **ap-southeast-1 (Singapore)**
   - Click **"Create"**
4. In your database dashboard, copy:
   - **UPSTASH_REDIS_REST_URL** (looks like `https://xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN**
   
   Also note the **Endpoint** and **Password** for Redis connection:
   ```
   redis://default:[password]@xxx.upstash.io:6379
   ```
5. Save these values

---

## 1D. File Storage — Cloudflare R2 (Free, 10GB)

1. Go to **https://cloudflare.com** → Sign up (free)
2. In dashboard, click **"R2 Object Storage"** (left sidebar)
3. Click **"Create bucket"**
   - Bucket name: `academic-platform-files`
   - Location: **Asia Pacific (APAC)**
   - Click **"Create bucket"**
4. Go to **"R2 Overview"** → **"Manage R2 API tokens"**
5. Click **"Create API token"**
   - Token name: `academic-platform`
   - Permissions: **Object Read & Write**
   - Click **"Create API Token"**
6. **IMPORTANT: Save these NOW — shown only once:**
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (looks like: `https://[account-id].r2.cloudflarestorage.com`)

---

## 1E. Email — Gmail App Password (Free)

1. Log into your **Gmail account**
2. Go to **Google Account Settings** → **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Search for **"App passwords"** in Google Account settings
5. Select app: **Mail**, Select device: **Other** → Type: `Academic Platform`
6. Click **Generate** → Copy the 16-character password
7. Save: your Gmail address + this app password

---

# STEP 2: Prepare Your Code

## 2A. Install Git (if not installed)

Download from: **https://git-scm.com/download/win**
Run the installer with default settings.

## 2B. Create a GitHub Account (if you don't have one)

Go to **https://github.com** → Sign up

## 2C. Push Your Code to GitHub

Open **Command Prompt** or **PowerShell** as Administrator:

```cmd
cd "D:\MIP\New Website for MIP\academic-platform"
git init
git add .
git commit -m "Initial commit - Academic Research Platform"
```

Now create a new repository on GitHub:
1. Go to **https://github.com/new**
2. Repository name: `academic-research-platform`
3. Set to **Private** (recommended for academic use)
4. Click **"Create repository"**
5. Copy the repository URL (e.g., `https://github.com/yourusername/academic-research-platform.git`)

Back in Command Prompt:
```cmd
git remote add origin https://github.com/yourusername/academic-research-platform.git
git branch -M main
git push -u origin main
```

Enter your GitHub username and password (or use a personal access token).

---

# STEP 3: Deploy the Backend (Railway)

Railway hosts your Node.js API server + Socket.IO.

1. Go to **https://railway.app** → **"Login"**
2. Sign up with **GitHub** (click "Authorize Railway")
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `academic-research-platform` repository
5. Railway will detect it — click **"Add service"**
6. Click on the service → **"Settings"**
   - Root Directory: `/backend`
   - Start Command: `node src/app.js`
   - Click Save

7. Click **"Variables"** tab → **"Add Variables"**
   
   Add ALL of these (one by one):
   
   ```
   NODE_ENV = production
   PORT = 5000
   API_VERSION = v1
   
   # PostgreSQL (from Supabase Step 1A)
   PG_HOST = db.xxxxx.supabase.co
   PG_PORT = 5432
   PG_DATABASE = postgres
   PG_USER = postgres
   PG_PASSWORD = [your-supabase-password]
   
   # MongoDB (from Step 1B)
   MONGO_URI = mongodb+srv://academicadmin:[password]@academic-chat.xxxxx.mongodb.net/academic_chat
   
   # Redis (from Upstash Step 1C)
   REDIS_HOST = xxx.upstash.io
   REDIS_PORT = 6379
   REDIS_PASSWORD = [your-upstash-password]
   
   # JWT (GENERATE THESE: go to https://generate-secret.vercel.app/64)
   JWT_SECRET = [paste-64-char-random-string]
   JWT_REFRESH_SECRET = [paste-another-64-char-random-string]
   JWT_EXPIRE = 7d
   JWT_REFRESH_EXPIRE = 30d
   
   # Email (from Step 1E)
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = your.email@gmail.com
   SMTP_PASS = [your-16-char-app-password]
   EMAIL_FROM = your.email@gmail.com
   EMAIL_FROM_NAME = Academic Research Platform
   
   # Cloudflare R2 File Storage (from Step 1D)
   AWS_ACCESS_KEY_ID = [cloudflare-access-key]
   AWS_SECRET_ACCESS_KEY = [cloudflare-secret-key]
   AWS_REGION = auto
   AWS_S3_BUCKET = academic-platform-files
   # NOTE: Also set this for Cloudflare R2 endpoint:
   S3_ENDPOINT_URL = https://[account-id].r2.cloudflarestorage.com
   
   # OpenAI (get from https://platform.openai.com/api-keys)
   OPENAI_API_KEY = sk-...
   OPENAI_MODEL = gpt-4o-mini
   
   # Frontend URL (fill in after Step 4)
   FRONTEND_URL = https://your-app.vercel.app
   ALLOWED_ORIGINS = https://your-app.vercel.app
   ```

8. Click **"Deploy"** → Wait 3-5 minutes
9. Once deployed, click **"Settings"** → Copy your Railway URL:
   `https://your-backend.railway.app`
10. **Test it:** Open browser → go to `https://your-backend.railway.app/health`
    - You should see: `{"status":"healthy"}`

---

# STEP 4: Deploy the Frontend (Vercel)

1. Go to **https://vercel.com** → **"Sign Up"**
2. Sign up with **GitHub**
3. Click **"New Project"**
4. Import your `academic-research-platform` repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click "Edit" → type `frontend` → click "Continue"
6. Expand **"Environment Variables"** → Add:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL = https://your-backend.railway.app
   NEXT_PUBLIC_API_VERSION = v1
   ```
   Replace with your actual Railway URL from Step 3.

7. Click **"Deploy"** → Wait 2-3 minutes
8. Vercel gives you a URL like: `https://academic-research-platform.vercel.app`
9. **Copy this URL**

## Update Backend with Frontend URL

Go back to Railway → Your service → **Variables** → Update:
```
FRONTEND_URL = https://academic-research-platform.vercel.app
ALLOWED_ORIGINS = https://academic-research-platform.vercel.app
```
Railway will auto-redeploy.

---

# STEP 5: Create Your First Admin Account

1. Open your app: `https://academic-research-platform.vercel.app`
2. You'll see the login page — click **"Request Access"** / **"Register"**
3. Fill in:
   - First Name: Your name
   - Last Name: Your surname
   - Email: your.email@college.edu
   - Phone: your mobile
   - Role: **Professor**
   - Password: Strong password
4. Click **"Create Account"**
5. Check your email → Click the verification link

6. **Make yourself Super Admin:**
   - Open Supabase → SQL Editor → Run:
   ```sql
   UPDATE users
   SET role = 'super_admin', status = 'active'
   WHERE email = 'your.email@college.edu';
   ```
7. Log in with your credentials → You now have full admin access!

---

# STEP 6: Set Up Your Institution

After logging in as Super Admin:

1. Go to **Admin Panel** (from sidebar)
2. Click **"Institutions"** → **"Add Institution"**
   - Name: Your college/university name
   - Code: Short code (e.g., `MIPPC`)
   - Address, City, State, Phone, Email
   - Click **"Save"**

3. Click **"Departments"** → Add your departments:
   - Pharmacy, Chemistry, Biology, etc.

4. Note your Institution ID from the URL or database

---

# STEP 7: Add Students & Faculty

## Option A: Send Registration Link to Students

Share this message with your students (WhatsApp/Email):

```
📚 Dear Students,

Our Academic Research Platform is now live!

🔗 Registration Link:
https://academic-research-platform.vercel.app/register

Steps to join:
1. Open the link
2. Fill in your name, email, phone
3. Select your role (PhD Scholar / PG Student)
4. Create a password
5. Verify your email

After registering, wait for approval.
Your Guide: [Your Name]

Any issues? Contact: your.email@college.edu
```

## Option B: Admin Creates Accounts Directly

1. Go to **Admin → Users → Add User**
2. Fill in student details
3. The system generates a temporary password
4. Share credentials with students via email

---

# STEP 8: Start Using the Platform

## As a Professor — First Steps

### 1. Create a Research Group
- Sidebar → **Research** → **Groups** → **"Create Group"**
- Name: "PhD Batch 2024" or "Research Lab A"
- Add your scholars to the group

### 2. Create Research Projects
- **Research** → **Projects** → **"New Project"**
- Select your scholar, add thesis title, type (PhD/PG), timeline

### 3. Assign Your First Goal
- **Goals & Milestones** → **"Assign Goal"**
- Select scholar, add title, deadline, milestones
- Click save → Scholar gets notified instantly

### 4. Start a Group Chat
- **Chat** → **"+"** → Create Group Chat
- Add all your scholars
- Send your first announcement

### 5. Upload Course Materials
- **Courses** → **"New Course"** → Add modules and lessons

---

## As a Student — First Steps

1. Log in → See your personal dashboard
2. Check **Goals & Tasks** — view what your guide assigned
3. Update goal status → Click goal → drag progress slider → Save
4. Join **Chat** → Message your guide directly
5. Upload thesis chapter → **Files** → Upload

---

# 🛡️ Security Setup (Important!)

## Change Default Settings

1. In Railway Variables, make sure your JWT secrets are long random strings
2. Enable **2-Factor Authentication** on your professor account:
   - Profile Settings → Security → Enable 2FA
   - Scan QR with Google Authenticator app

---

# 📱 Mobile Access

Students can use the web app on mobile browsers directly — it's fully responsive.

**For best mobile experience:**
- Open Chrome on Android → Visit your app URL → Menu → **"Add to Home Screen"**
- It will install like a native app (PWA)

---

# 🔧 Troubleshooting

| Problem | Solution |
|---------|---------|
| Login not working | Check FRONTEND_URL in Railway matches your Vercel URL exactly |
| Emails not sending | Verify Gmail App Password is correct (no spaces) |
| File upload fails | Check Cloudflare R2 credentials in Railway variables |
| Chat not real-time | Socket.IO needs Railway (not Render free tier). Railway works ✓ |
| Database error | Check Supabase — project may be paused. Click "Restore project" |
| AI assistant not working | Add valid OPENAI_API_KEY. Get from platform.openai.com |

---

# 💰 Monthly Cost Summary

| Service | Free Tier | Cost if Exceeded |
|---------|-----------|-----------------|
| Vercel (Frontend) | Unlimited | $20/month |
| Railway (Backend) | $5/month | Pay per use |
| Supabase (PostgreSQL) | 500MB | $25/month |
| MongoDB Atlas (Chat) | 512MB | $9/month |
| Upstash (Redis) | 500K cmds | $0.20 per 100K |
| Cloudflare R2 (Files) | 10GB | $0.015/GB |
| **TOTAL** | **~$5/month** | |

**For 50 students + 5 professors:** Free tier is more than sufficient.

---

# 🆘 Need Help?

If you get stuck at any step:
1. Take a screenshot of the error
2. Note which step number you're on
3. Share with your IT team or developer

**Most common issue:** Forgetting to update FRONTEND_URL in Railway after Vercel deployment.

---

*This guide is for Academic Research Platform v1.0.0*
*Created for university professors and research guides*
