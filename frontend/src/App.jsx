import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Mic, LayoutDashboard, LogOut, ReceiptText, Bot, Wallet, TrendingDown, HeartPulse, Calendar, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Route-based code-splitting: each page loads only when visited
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const VoiceExpenseInput = lazy(() => import('@/features/expenses/VoiceExpenseInput'));
const Budgets = lazy(() => import('@/features/budgets/Budgets'));
const Transactions = lazy(() => import('@/features/expenses/Transactions'));
const AICoach = lazy(() => import('@/features/ai/AICoach'));
const IncomeTracker = lazy(() => import('@/features/income/IncomeTracker'));
const DebtPlanner = lazy(() => import('@/features/debts/DebtPlanner'));
const HealthHub = lazy(() => import('@/features/dashboard/HealthHub'));
const SubscriptionTracker = lazy(() => import('@/features/subscriptions/SubscriptionTracker'));
const ReceiptGallery = lazy(() => import('@/features/receipts/ReceiptGallery'));
const Landing = lazy(() => import('@/features/landing/Landing'));
const Login = lazy(() => import('@/features/auth/Login'));
const Register = lazy(() => import('@/features/auth/Register'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0b0b17]/90 backdrop-blur-xl border-t border-white/10 p-3 md:relative md:border-t-0 md:border-r md:border-white/10 md:w-64 md:h-screen z-50 flex md:flex-col justify-between md:bg-gradient-to-b md:from-[#13132a] md:via-[#0e0e1f] md:to-[#0b0b17]">
      {/* Ambient glow behind the sidebar (desktop only) */}
      <div className="pointer-events-none absolute inset-0 hidden md:block overflow-hidden">
        <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-24 -right-10 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <div className="relative flex md:flex-col justify-around md:justify-start md:gap-1.5 w-full h-full max-w-lg mx-auto md:max-w-none md:overflow-y-auto">

        {/* Logo for Desktop */}
        <div className="hidden md:flex items-center gap-2.5 mb-8 px-2 pt-1">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
            <Mic size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">FinVoice</span>
        </div>

        {/* Section label (desktop) */}
        <p className="hidden md:block px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">Menu</p>

        <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/')} />
        <NavItem to="/add" icon={<Mic size={20} />} label="Voice Input" active={isActive('/add')} primary />
        <NavItem to="/budgets" icon={<PieChart size={20} />} label="Budgets" active={isActive('/budgets')} />
        <NavItem to="/transactions" icon={<ReceiptText size={20} />} label="Transactions" active={isActive('/transactions')} />
        <NavItem to="/incomes" icon={<Wallet size={20} />} label="Income" active={isActive('/incomes')} desktopOnly />
        <NavItem to="/debts" icon={<TrendingDown size={20} />} label="Debt Planner" active={isActive('/debts')} desktopOnly />
        <NavItem to="/subscriptions" icon={<Calendar size={20} />} label="Subscriptions" active={isActive('/subscriptions')} desktopOnly />
        <NavItem to="/receipts" icon={<Camera size={20} />} label="Receipts Gallery" active={isActive('/receipts')} desktopOnly />
        <NavItem to="/health" icon={<HeartPulse size={20} />} label="Health Hub" active={isActive('/health')} desktopOnly />
        <NavItem to="/coach" icon={<Bot size={20} />} label="AI Coach" active={isActive('/coach')} />

        {/* User profile & Logout at the bottom for desktop */}
        <div className="hidden md:flex flex-col gap-1 mt-auto pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/25">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{user?.username}</p>
              <p className="text-xs text-white/45 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>

        {/* Logout at the end of nav items on mobile */}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center text-white/50 hover:text-red-400 md:hidden transition-colors cursor-pointer"
        >
          <LogOut size={20} />
          <span className="text-[10px] mt-1 font-medium">Log Out</span>
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, icon, label, active, primary, desktopOnly }) {
  if (primary) {
    return (
      <Link to={to} className={`relative flex flex-col items-center justify-center md:flex-row md:justify-start ${desktopOnly ? 'hidden md:flex' : 'flex'}`}>
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className={`btn-shine p-4 rounded-full -mt-10 shadow-xl md:mt-0 md:w-full md:p-0 md:rounded-xl md:py-2.5 md:px-3 md:flex md:items-center md:gap-3.5 z-10 bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-500/40 ${active ? 'ring-2 ring-white/40' : ''}`}
        >
          {icon}
          <span className="hidden md:block font-semibold text-sm">{label}</span>
        </motion.div>
        <span className="text-xs mt-1 font-medium md:hidden text-primary">{label}</span>
      </Link>
    );
  }

  return (
    <Link to={to} className={`relative flex-col items-center md:flex-row md:justify-start md:gap-3.5 md:px-3 md:py-2.5 md:rounded-xl transition-colors ${active ? 'text-indigo-400 md:text-white' : 'text-white/55 hover:text-white md:hover:bg-white/5'} ${desktopOnly ? 'hidden md:flex' : 'flex'}`}>
      {active && (
        <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl hidden md:block bg-gradient-to-r from-indigo-500/90 to-violet-600/90 shadow-lg shadow-indigo-500/25" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
      )}
      <div className="z-10 shrink-0">{icon}</div>
      <span className="text-[10px] md:text-sm mt-1 font-medium md:mt-0 z-10">{label}</span>
    </Link>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20 md:pb-0 flex flex-col md:flex-row w-full">
      <Navigation />
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 pt-6 md:pt-10 h-full overflow-y-auto">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes>
            <Route path="/" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <Dashboard />
              </motion.div>
            } />
            <Route path="/add" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full h-full flex items-center justify-center">
                <VoiceExpenseInput />
              </motion.div>
            } />
            <Route path="/budgets" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <Budgets />
              </motion.div>
            } />
            <Route path="/transactions" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <Transactions />
              </motion.div>
            } />
            <Route path="/incomes" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <IncomeTracker />
              </motion.div>
            } />
            <Route path="/debts" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <DebtPlanner />
              </motion.div>
            } />
            <Route path="/health" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <HealthHub />
              </motion.div>
            } />
            <Route path="/subscriptions" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <SubscriptionTracker />
              </motion.div>
            } />
            <Route path="/receipts" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <ReceiptGallery />
              </motion.div>
            } />
            <Route path="/coach" element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.3 }} className="w-full">
                <AICoach />
              </motion.div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

function UnauthenticatedApp() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 w-full">
              <Login />
            </div>
          }
        />
        <Route
          path="/register"
          element={
            <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 w-full">
              <Register />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading FinVoice...</p>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
