# PadhaiHub 🎓
### AI-Powered Student OS — Complete Academic Assistant

PadhaiHub is a comprehensive AI-powered academic workspace designed for students. It offers intelligent syllabus breakdowns, past year question (PYQ) pattern analysis, automated revision notes, handwritten assignment generation, oral viva simulators, study schedule planning, and AI-assisted doubt resolution.

---

## 👥 Team Collaboration
Developed and maintained collaboratively by the project team.

---

## 🚀 Quick Start (VS Code)

### Prerequisites
- Node.js 18+ or 20+ ([download](https://nodejs.org))
- npm (default package manager)
- VS Code ([download](https://code.visualstudio.com))
- Git

---

## 📁 Project Structure

```
examind-ai/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── analyze-syllabus/route.ts
│   │   │   ├── analyze-pyq/route.ts
│   │   │   ├── generate-notes/route.ts
│   │   │   ├── generate-assignment/route.ts
│   │   │   ├── generate-handwriting/route.ts
│   │   │   ├── viva-questions/route.ts
│   │   │   ├── study-plan/route.ts
│   │   │   ├── predict-performance/route.ts
│   │   │   └── chat/route.ts
│   │   ├── user/
│   │   │   └── usage/route.ts
│   │   ├── payment/
│   │   │   ├── create-order/route.ts
│   │   │   ├── verify/route.ts
│   │   │   └── cancel/route.ts
│   │   └── webhook/
│   │       └── razorpay/route.ts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── syllabus/page.tsx
│   │   ├── pyq/page.tsx
│   │   ├── notes/page.tsx
│   │   ├── assignments/page.tsx
│   │   ├── viva/page.tsx
│   │   ├── planner/page.tsx
│   │   ├── chatbot/page.tsx
│   │   ├── predictor/page.tsx
│   │   ├── billing/page.tsx
│   │   └── settings/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── ui/
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       └── separator.tsx
├── firebase/
│   ├── config.ts
│   ├── auth.ts
│   ├── firestore.ts
│   ├── storage.ts
│   └── admin.ts
├── hooks/
│   └── index.ts
├── lib/
│   └── auth-context.tsx
├── services/
│   ├── ai.ts
│   ├── nvidia.ts
│   ├── usage.ts
│   ├── handwriting.ts
│   └── payment.ts
├── utils/
│   └── index.ts
├── .env.example
├── firestore.rules
├── storage.rules
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🛠️ Step-by-Step Setup

### Step 1: Install Dependencies

Use **npm** as the primary package manager:

```bash
cd examind-ai
npm install
```

If you encounter peer dependency warnings on specific Node environments:
```bash
npm install --legacy-peer-deps
```

---

### Step 2: Environment Variables

Copy the example configuration file:
```bash
cp .env.example .env.local
```

Open `.env.local` and populate the required keys.

---

### Step 3: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new Firebase project (e.g., `padhaihub` or `examind-ai`)

#### Enable Authentication
- Go to **Authentication** → **Sign-in method**
- Enable **Email/Password** provider
- Enable **Google** provider
- Add authorized domain (e.g., `localhost`)

#### Enable Firestore Database
- Go to **Firestore Database** → **Create database**
- Start in production or test mode and deploy the security rules provided in `firestore.rules`

#### Enable Storage
- Go to **Storage** → **Get started**
- Deploy the security rules provided in `storage.rules`

#### Firebase Configuration in `.env.local`
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### Firebase Admin SDK (Server-Side)
```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

### Step 4: AI Model API Setup (Groq & NVIDIA)

The application utilizes **Groq** for high-speed LLM inference and **NVIDIA NIM** for accelerated models.

1. **Groq API**:
   - Sign up at [Groq Console](https://console.groq.com)
   - Generate an API Key
   - Add to `.env.local`:
     ```env
     GROQ_API_KEY=gsk_...
     GROQ_MODEL=llama-3.3-70b-versatile
     ```

2. **NVIDIA API**:
   - Get API credentials from [NVIDIA build/NIM](https://build.nvidia.com)
   - Add to `.env.local`:
     ```env
     NVIDIA_API_KEY=nvapi-...
     NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
     NVIDIA_MODEL=meta/llama-3.3-70b-instruct
     ```

---

### Step 5: Free Daily Quota & Payments Status

- **Status**: The platform is currently **100% free for all students**.
- **Daily Quotas**:
  - **5 PDF / Document Ingestions** per day (Syllabus / PYQ analysis)
  - **35 AI Tutor Questions** per day (Chatbot & doubt solving)
  - Quotas automatically reset daily at **00:00 IST** (Asia/Kolkata timezone).
- **Payments**: Payment endpoints and Razorpay integrations are neutralized/disabled in this version while the product is provided free of charge.

---

### Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Build & Deployment

To verify and create a production build:
```bash
npm run build
npm start
```

---

## 🔧 VS Code Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "PKief.material-icon-theme",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

---

## 🐛 Common Troubleshooting

### Firebase Permissions
- Ensure Firestore and Storage security rules are deployed:
  ```bash
  firebase deploy --only firestore:rules,storage:rules
  ```
- Ensure the user is authenticated before calling protected Firestore queries.

### AI Model Key Missing
- Check that `GROQ_API_KEY` and `NVIDIA_API_KEY` are configured in `.env.local`.
- Restart the dev server after editing environment variables.

### Timezone Quota Reset
- Daily quotas reset according to IST (`Asia/Kolkata`).

---

## 📊 Database Collections Reference

| Collection | Description |
|------------|-------------|
| `users` | User profiles, subject tracking, aggregate study streak |
| `dailyUsage` | Daily rate limiting and quota counts (`{uid}_{date}`) |
| `uploads` | Syllabus & PYQ file uploads and metadata |
| `notes` | Generated AI revision notes |
| `assignments` | Assignment questions and solutions |
| `chatHistory` | AI tutor conversation history |
| `studyPlans` | Generated 7-day study schedules |
| `predictions` | PYQ frequency analysis and exam readiness scores |

---

## 🎯 Feature Matrix

- [x] Firebase Authentication (Email/Password & Google)
- [x] Protected Student Dashboard & Dark Mode
- [x] Syllabus Topic Weightage Analyzer
- [x] PYQ Frequency & High-Yield Topic Predictor
- [x] AI Revision Notes Generator (5 formats)
- [x] Handwritten Assignment Export
- [x] Interactive Oral Viva Simulator
- [x] 7-Day Time-Blocked Study Schedule Planner
- [x] Context-Aware AI Doubt Resolution Chatbot
- [x] Persistent Daily Quota Management (5 PDFs / 35 chats daily)

---

Built with Next.js 15, TypeScript, Tailwind CSS, Firebase, Groq, and NVIDIA AI.
