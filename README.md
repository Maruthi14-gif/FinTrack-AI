# FinTrack AI — Modern Smart Expense Tracker

FinTrack AI is a next-generation personal finance manager equipped with AI-driven receipt scanning, dynamic budget calculations, debt planning, transaction exporting, and native web push notifications. Built using a modern TypeScript backend and a polished glassmorphic React frontend.

---

## Key Features

- **Multimodal AI Receipt Scanner**: Drop or upload receipt images. Analyzed via `gemini-2.5-flash` to extract merchant, total cost, items, and categorization with manual edit options and quota-limit fallback.
- **Receipt Gallery**: Interactive dashboard displaying scanned receipts with full text-search, status filters (processed vs. fallback), and a glassmorphic overlay displaying OCR details and deletion capability.
- **Native Web Push Notifications**: Native desktop and mobile notifications delivered using the Web Push Protocol, powered by dynamic VAPID keys. Auto-notifies users when budgets are exceeded or billing events occur.
- **Real-time Analytics & Dashboards**: Premium glassmorphic interface with interactive Recharts charts showing budget utilization, income, expenses, and debts.
- **PDF, Excel & CSV Exports**: One-click branded PDF reports (jsPDF + autotable), real `.xlsx` workbooks with a summary sheet (SheetJS), and CSV — all generated client-side from any filtered transaction view. Export libraries are lazy-loaded so they never slow the initial page load.
- **Spending Anomaly Detection**: Every saved expense is compared against the category's 3-month average; unusual spikes trigger an in-app + push notification, and `GET /api/analytics/anomalies` powers dashboard insights.
- **Voice Expense Input**: Add transactions using interactive voice recognition in English, Hindi, or Telugu.
- **Animated 3D Landing Page**: Public marketing page with a mouse-tracking 3D dashboard mockup, floating gradient blobs, tilt-on-hover feature cards, and scroll-reveal sections — built with Framer Motion and CSS 3D transforms (no heavy 3D library).

---

## Project Structure

The codebase follows a layered architecture so every piece of logic has one obvious home:

```
backend/src/
├── server.ts            # App entry: express setup + route mounting
├── config/db.ts         # MongoDB connection
├── routes/              # THIN routing only — path → controller wiring
├── controllers/         # Request/response handling per domain (auth, expenses, budgets, ai, ...)
├── services/            # Business & AI logic, reusable and framework-free
│   ├── aiService.ts         # Voice/text expense parsing + insights (Gemini)
│   ├── chatService.ts       # AI financial assistant chat
│   ├── queryService.ts      # Natural-language → database filter translation
│   ├── summaryService.ts    # Monthly AI report with 1-hour caching
│   ├── receiptService.ts    # Receipt image storage + Gemini vision OCR
│   ├── alertService.ts      # Budget alerts, bill reminders, anomaly detection
│   └── debtPlanService.ts   # Snowball vs Avalanche payoff simulation
├── models/              # Mongoose schemas (User, Expense, Budget, ...)
├── middlewares/         # JWT auth guard
└── utils/gemini.ts      # Shared Gemini client + JSON/category helpers

frontend/src/
├── App.jsx              # Router with lazy-loaded (code-split) routes
├── features/            # One folder per feature, screens grouped by domain
│   ├── landing/             # Public 3D marketing page
│   ├── auth/                # Login, Register
│   ├── dashboard/           # Dashboard, HealthHub
│   ├── expenses/            # VoiceExpenseInput, Transactions
│   └── budgets/ income/ debts/ subscriptions/ receipts/ ai/ notifications/
├── components/ui/       # Shared design-system primitives (button, card, input, ...)
├── context/             # AuthContext (JWT session state)
└── lib/                 # api.js (axios), exporters.js (PDF/Excel/CSV), utils.js
```

**Request flow**: `route → controller → service → model`. Controllers never contain business logic; services never touch `req`/`res`. To add a feature, create its service + controller, wire a thin route, and drop the screen into `frontend/src/features/<name>/`.

---

## Technology Stack

### Frontend
- **Framework**: React 19 (via Vite)
- **Styling**: Tailwind CSS & Vanilla CSS (Curated HSL color systems, Glassmorphism, CSS Micro-animations)
- **State & Routing**: React Router DOM, Custom Contexts (AuthContext)
- **Data Visualizations**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion (page transitions, 3D tilt, scroll reveals)
- **Reports**: jsPDF + jspdf-autotable (PDF), SheetJS `xlsx` (Excel) — dynamically imported on demand

### Backend
- **Runtime & Language**: Node.js, TypeScript (`tsx` compilation)
- **Framework**: Express
- **Database**: MongoDB (via Mongoose ODM)
- **Push Services**: Web-Push Protocol (VAPID key signatures)
- **AI Integrations**: Google Gemini API (`@google/genai` sdk, `gemini-2.5-flash` model)

---

## Architecture Sketch

Below is the high-level architecture sketch detailing the interaction between the client, backend server, database, and third-party integrations:

```mermaid
%%{init: {'theme': 'default', 'look': 'handDrawn'}}%%
graph TD
    subgraph Client [React Frontend - Port 5173]
        UI[Glassmorphic User Interface]
        SW[Service Worker sw.js]
        V_Input[Voice/Receipt Inputs]
    end

    subgraph Server [Express Backend - Port 5000]
        API[Express Router]
        Auth[Auth Middleware]
        M_Hook[Post-Save Notification Hook]
    end

    subgraph External [Third-Party Services]
        Gemini[Gemini AI SDK]
        PushService[Browser Push Service APNS/FCM]
    end

    subgraph Database [MongoDB Atlas]
        DB[(Collections: Users, Expenses, Budgets, Notifications, PushSubscriptions)]
    end

    %% User interactions
    UI -->|API Requests| API
    UI -->|Prompts Push Permission| SW
    SW -->|Register Push endpoint| API
    V_Input -->|Uploads Image| API

    %% Backend processing
    API -->|Validates JWT| Auth
    API -->|Queries/Updates| DB
    API -->|Sends Images| Gemini
    Gemini -.->|OCR Parse Result| API

    %% Push System hook
    DB ===|On Notification Document Save| M_Hook
    M_Hook -->|web-push Dispatch| PushService
    PushService -.->|Delivers payload| SW
    SW -->|Trigger Notification| UI
```

---

## Local Setup & Configuration

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (Local server or MongoDB Atlas connection string)

### 1. Clone & Directory Structure
```bash
git clone https://github.com/Maruthi14-gif/FinTrack-AI.git
cd FinTrack-AI
```

### 2. Environment Variables Configuration

#### Backend Configuration (`backend/.env`)
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
MONGO_URI=mongodb+srv://your-db-uri
JWT_SECRET=your_jwt_signature_secret
GEMINI_API_KEY=your_gemini_api_key

# Optional: If not provided, backend generates VAPID keys dynamically in-memory on start
VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
```

#### Frontend Configuration (`frontend/.env`)
Create a `.env` file in the `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Installation & Run

Open two terminal windows to run the servers in parallel:

#### Terminal 1 (Backend)
```bash
cd backend
npm install
npm run dev
```
- Server will listen on: `http://localhost:5000`
- Logs will show: `VAPID keys not configured. Generating dynamic keys...` or similar status.

#### Terminal 2 (Frontend)
```bash
cd frontend
npm install
npm run dev
```
- App will run on: `http://localhost:5173`

---

## Deployment Instructions

### Production Build compilation
Before deploying, ensure that the project compiles with no warnings or type errors:

```bash
# In backend/
npm run build

# In frontend/
npm run build
```

### Backend Deployment (e.g., Render, Heroku)
1. Set the build command to: `cd backend && npm install && npm run build`
2. Set the start command to: `node backend/dist/server.js`
3. Configure environmental variables on your host platform matching your `backend/.env`.

### Frontend Deployment (e.g., Vercel, Netlify)
1. Point your host to the root of the repo.
2. Select target directory as `frontend`.
3. Set the build command to: `npm run build`
4. Set the output directory to: `dist`
5. Configure `VITE_API_URL` pointing to your hosted backend API URL.

---

## How to Use Native Push Notifications

1. Open the application.
2. Click on the **Notification Bell** icon in the navigation bar.
3. Click the **"Enable Phone Notifications"** opt-in banner.
4. When prompted by your browser, click **Allow**.
5. To test notifications:
   - Go to **Budgets** and create a category budget (e.g., *Food*: $50).
   - Add a transaction that exceeds this budget limit.
   - You will receive a system-level slide-out browser notification natively on your device, even if the application tab is running in the background.
