import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Mic, LayoutDashboard, Settings, LogOut, ReceiptText, Bot, Wallet, TrendingDown, HeartPulse, Calendar, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import VoiceExpenseInput from './components/VoiceExpenseInput';
import Budgets from './components/Budgets';
import Transactions from './components/Transactions';
import AICoach from './components/AICoach';
import IncomeTracker from './components/IncomeTracker';
import DebtPlanner from './components/DebtPlanner';
import HealthHub from './components/HealthHub';
import SubscriptionTracker from './components/SubscriptionTracker';
import ReceiptGallery from './components/ReceiptGallery';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider, useAuth } from './context/AuthContext';

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background/80 backdrop-blur-md border-t border-border p-4 md:relative md:border-t-0 md:border-r md:w-64 md:h-screen z-50 flex md:flex-col justify-between">
      <div className="flex md:flex-col justify-around md:justify-start md:gap-4 w-full h-full max-w-lg mx-auto md:max-w-none">
        
        {/* Logo for Desktop */}
        <div className="hidden md:flex items-center gap-2 mb-10 px-4">
          <div className="bg-primary p-2 rounded-lg">
            <Mic size={20} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">FinVoice</span>
        </div>

        <NavItem to="/" icon={<LayoutDashboard size={24} />} label="Dashboard" active={isActive('/')} />
        <NavItem to="/add" icon={<Mic size={24} />} label="Voice Input" active={isActive('/add')} primary />
        <NavItem to="/budgets" icon={<PieChart size={24} />} label="Budgets" active={isActive('/budgets')} />
        <NavItem to="/transactions" icon={<ReceiptText size={24} />} label="Transactions" active={isActive('/transactions')} />
        <NavItem to="/incomes" icon={<Wallet size={24} />} label="Income" active={isActive('/incomes')} desktopOnly />
        <NavItem to="/debts" icon={<TrendingDown size={24} />} label="Debt Planner" active={isActive('/debts')} desktopOnly />
        <NavItem to="/subscriptions" icon={<Calendar size={24} />} label="Subscriptions" active={isActive('/subscriptions')} desktopOnly />
        <NavItem to="/receipts" icon={<Camera size={24} />} label="Receipts Gallery" active={isActive('/receipts')} desktopOnly />
        <NavItem to="/health" icon={<HeartPulse size={24} />} label="Health Hub" active={isActive('/health')} desktopOnly />
        <NavItem to="/coach" icon={<Bot size={24} />} label="AI Coach" active={isActive('/coach')} />
        
        {/* User profile & Logout at the bottom for desktop */}
        <div className="hidden md:flex flex-col gap-2 mt-auto border-t border-border/60 pt-4 px-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full text-left cursor-pointer"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>

        {/* Logout at the end of nav items on mobile */}
        <button 
          onClick={logout} 
          className="flex flex-col items-center justify-center text-muted-foreground hover:text-destructive md:hidden transition-colors cursor-pointer"
        >
          <LogOut size={24} />
          <span className="text-[10px] mt-1 font-medium">Log Out</span>
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, icon, label, active, primary, desktopOnly }) {
  if (primary) {
    return (
      <Link to={to} className={`relative flex flex-col items-center justify-center md:flex-row md:justify-start md:px-4 md:py-3 ${desktopOnly ? 'hidden md:flex' : 'flex'}`}>
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`p-4 rounded-full -mt-10 shadow-lg md:mt-0 md:p-3 md:rounded-xl z-10 transition-colors ${active ? 'bg-primary text-primary-foreground shadow-primary/30' : 'bg-primary/90 text-primary-foreground'}`}
        >
          {icon}
        </motion.div>
        <span className="text-xs mt-1 font-medium md:hidden text-primary">{label}</span>
        <span className="hidden md:block ml-3 font-medium text-primary">{label}</span>
      </Link>
    );
  }

  return (
    <Link to={to} className={`relative flex-col items-center md:flex-row md:justify-start md:px-4 md:py-3 md:rounded-xl transition-colors ${active ? 'text-primary md:bg-muted' : 'text-muted-foreground hover:text-foreground md:hover:bg-muted/50'} ${desktopOnly ? 'hidden md:flex' : 'flex'}`}>
      {active && (
        <motion.div layoutId="nav-pill" className="absolute inset-0 bg-muted rounded-xl hidden md:block" />
      )}
      <div className="z-10">{icon}</div>
      <span className="text-xs mt-1 font-medium md:ml-3 md:mt-0 z-10">{label}</span>
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
      </main>
    </div>
  );
}

function UnauthenticatedApp() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 w-full">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
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
