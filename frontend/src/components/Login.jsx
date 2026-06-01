import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-card/65 backdrop-blur-md border border-primary/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle border glow */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary"
          >
            <LogIn size={24} />
          </motion.div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Welcome back</h2>
          <p className="text-muted-foreground text-sm mt-2">Log in to manage your financial recovery</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 flex items-start gap-2.5 mb-6"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <Mail size={18} />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Password</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                <Lock size={18} />
              </span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group mt-8 disabled:opacity-75 disabled:pointer-events-none"
          >
            <span>{loading ? 'Logging in...' : 'Sign In'}</span>
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
