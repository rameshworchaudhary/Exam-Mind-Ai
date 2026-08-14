# ExamMind AI 🧠
### AI-Powered Student OS — Complete SaaS Platform

---

## 🚀 Quick Start (VS Code)

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org))
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
│   └── storage.ts
├── hooks/
│   └── index.ts
├── lib/
│   └── auth-context.tsx
├── services/
│   ├── ai.ts
│   ├── handwriting.ts
│   └── payment.ts
├── utils/
│   └── index.ts
├── .env.local.example
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

```bash
cd examind-ai
npm install
```

If you see peer dependency errors:
```bash
npm install --legacy-peer-deps
```

---

### Step 2: Environment Variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in all values (see sections below).

---

### Step 3: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** → name it `examind-ai`
3. Disable Google Analytics (optional) → **Create project**

#### Enable Authentication
- Go to **Authentication** → **Get started**
- Enable **Email/Password** provider
- Enable **Google** provider
  - Add your domain under Authorized domains: `localhost`

#### Enable Firestore
- Go to **Firestore Database** → **Create database**
- Choose **Start in test mode** (configure rules later)
- Select a region close to your users

#### Enable Storage
- Go to **Storage** → **Get started**
- Accept default rules for now

#### Get Firebase Config
- Go to **Project Settings** (gear icon) → **General**
- Scroll to **Your apps** → **Web app** → **Add app**
- Copy the config object values to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### Deploy Security Rules
Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init  # select Firestore + Storage
firebase deploy --only firestore:rules,storage:rules
```

---

### Step 4: OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an account / login
3. Go to **API Keys** → **Create new secret key**
4. Copy the key to `.env.local`:

```env
OPENAI_API_KEY=sk-proj-...
```

> **Note:** You need billing set up on OpenAI. Start with $5-10 credit for testing.

---

### Step 5: Payments

Payments are currently disabled in this repository — the product is free to use. All Razorpay integration and billing endpoints have been neutralized. If you later want to re-enable paid subscriptions, follow the original Razorpay integration steps and restore the payment routes.

---

### Step 6: Install Tailwind Animate Plugin

```bash
npm install tailwindcss-animate
```

---

### Step 7: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Vercel Deployment

### One-Click Deploy
1. Push code to GitHub
2. Go to [Vercel](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Add all environment variables from `.env.local`
5. Click **Deploy**

### Manual Deploy
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🔧 VS Code Recommended Extensions

Install these for best experience:

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

## 🐛 Common Errors & Fixes

### Error: `Module not found: 'canvas'`
```bash
# Already handled in next.config.ts with aliases
# If still errors:
npm install canvas --ignore-scripts
```

### Error: `FirebaseError: Missing or insufficient permissions`
- Check Firestore rules are deployed
- Make sure user is authenticated before Firestore calls

### Error: `OpenAI API key not found`
- Make sure `.env.local` exists (not `.env`)
- Restart dev server after adding env vars: `Ctrl+C` then `npm run dev`

### Error: `Razorpay is not defined`
- The Razorpay script loads client-side only
- Billing page has script loading built in

### Error: `CORS error on API routes`
- API routes are same-origin by default in Next.js
- If using external domain, add to `next.config.ts` headers

### Error: `pdf-parse` errors
- This package has Node.js dependencies
- Only use in API routes (server-side), never in client components

### Build Error: TypeScript errors
```bash
npm run build 2>&1 | head -50  # See first errors
```
Most common: missing types, fix with:
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

### Firebase Auth Domain Error in Production
Add your Vercel domain to Firebase:
- Firebase Console → Authentication → Settings → Authorized domains
- Add: `your-app.vercel.app`

---

## 💳 Payment Testing

Use Razorpay test credentials:

| Method | Test Details |
|--------|-------------|
| UPI | `success@razorpay` |
| Card (success) | `4111 1111 1111 1111`, any CVV, any future date |
| Card (failure) | `4000 0000 0000 0002` |
| Net Banking | Select any bank, use test credentials |

---

## 🔒 Production Security Checklist

- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules  
- [ ] Set `NEXTAUTH_SECRET` to a strong random string
- [ ] Use environment variables for all secrets
- [ ] Enable Firebase App Check
- [ ] Set rate limits on API routes
- [ ] Add HTTPS (Vercel handles this automatically)
- [ ] Switch Razorpay to live mode keys
- [ ] Add error monitoring (Sentry)

---

## 📊 Database Collections Reference

| Collection | Description |
|------------|-------------|
| `users` | User profiles, plan info, streak |
| `uploads` | Syllabus & PYQ file uploads |
| `notes` | Generated AI notes |
| `assignments` | Assignment questions & answers |
| `chatHistory` | Chatbot conversation history |
| `studyPlans` | Generated study schedules |
| `predictions` | PYQ & performance predictions |
| `subscriptions` | Razorpay subscription data |
| `paymentLogs` | Payment transaction history |

---

## 🎯 Feature Checklist

- [x] Firebase Authentication (Email + Google)
- [x] Protected Dashboard
- [x] Syllabus Analyzer with AI
- [x] PYQ Prediction Engine  
- [x] AI Notes Generator (5 types)
- [x] Handwritten Assignment PDF Generator
- [x] Viva Prep with Practice Mode
- [x] AI Study Planner
- [x] AI Chatbot
- [x] Performance Predictor
- [x] Razorpay Payment Integration
- [x] Free Trial System (2 days)
- [x] Billing Dashboard
- [x] Dark Mode
- [x] Responsive Design
- [x] Framer Motion Animations
- [x] Recharts Data Visualization

---

## 📞 Support

For issues, check:
1. Firebase Console for auth/database errors
2. OpenAI usage dashboard for API limits
3. Razorpay dashboard for payment logs
4. Browser console for frontend errors
5. Vercel logs for deployment issues

---

Built with ❤️ using Next.js 15, TypeScript, Firebase, OpenAI
