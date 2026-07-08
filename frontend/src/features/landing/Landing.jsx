import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion';
import {
  Mic, Camera, PieChart, Bot, BellRing, FileDown,
  Sparkles, ArrowRight, IndianRupee, TrendingUp, Wallet,
  Languages, ShieldCheck, CloudUpload
} from 'lucide-react';

// Mouse-tracking 3D tilt wrapper used by the hero mockup and feature cards
function TiltCard({ children, className = '', maxTilt = 10 }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 18 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 18 });

  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * maxTilt * 2);
    rotateX.set(-py * maxTilt * 2);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Counts up when scrolled into view
function Counter({ target, suffix = '', duration = 1200 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start;
    let raf;
    const tick = (ts) => {
      if (start === undefined) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>;
}

function FloatingChip({ children, className = '', delay = '' }) {
  return (
    <div
      className={`absolute z-20 flex items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-float ${delay} ${className}`}
      style={{ transform: 'translateZ(60px)' }}
    >
      {children}
    </div>
  );
}

// Miniature fake dashboard rendered in pure CSS — the hero's 3D centerpiece
function HeroMockup() {
  const bars = [42, 68, 35, 80, 55, 92];
  return (
    <TiltCard maxTilt={8} className="relative w-full max-w-md perspective-1200">
      <div className="preserve-3d relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-500/90 via-violet-600/90 to-fuchsia-600/80 p-6 shadow-2xl shadow-indigo-900/40 backdrop-blur-xl">
        {/* mock header */}
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white/20 p-2"><Mic size={16} className="text-white" /></div>
            <span className="text-sm font-bold tracking-tight text-white">FinVoice</span>
          </div>
          <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Live</span>
        </div>

        {/* mock balance */}
        <div className="mt-5" style={{ transform: 'translateZ(45px)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-100/80">This month</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-white">₹24,350</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-200">
            <TrendingUp size={13} /> 12% under budget
          </p>
        </div>

        {/* mock bar chart */}
        <div className="mt-6 flex h-24 items-end gap-2" style={{ transform: 'translateZ(35px)' }}>
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
              className={`flex-1 rounded-t-lg ${i === bars.length - 1 ? 'bg-white' : 'bg-white/35'}`}
            />
          ))}
        </div>

        {/* mock voice entry row */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm" style={{ transform: 'translateZ(50px)' }}>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
            <Mic size={16} className="text-indigo-600" />
            <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">"Spent 250 on groceries"</p>
            <p className="text-[10px] text-indigo-100/75">Saved to Food · just now</p>
          </div>
        </div>
      </div>

      {/* floating chips around the card */}
      <FloatingChip className="-top-5 -left-4 sm:-left-10">
        <Camera size={13} /> Receipt scanned
      </FloatingChip>
      <FloatingChip className="top-1/3 -right-3 sm:-right-12" delay="animation-delay-3s">
        <IndianRupee size={13} /> ₹1,200 Petrol
      </FloatingChip>
      <FloatingChip className="-bottom-5 left-8" delay="animation-delay-6s">
        <BellRing size={13} /> Budget 80% used
      </FloatingChip>
    </TiltCard>
  );
}

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice Expense Entry',
    desc: 'Say "spent 250 on groceries" in English, Hindi, or Telugu — AI extracts the amount, category, and date instantly.'
  },
  {
    icon: Camera,
    title: 'AI Receipt Scanner',
    desc: 'Snap a receipt and Gemini vision reads the merchant, total, and every line item into your ledger.'
  },
  {
    icon: PieChart,
    title: 'Live Analytics',
    desc: 'Interactive charts for daily, weekly, monthly, and yearly spend with category distribution at a glance.'
  },
  {
    icon: Bot,
    title: 'AI Financial Coach',
    desc: 'Ask anything — "how much did I spend last week?" — and get answers grounded in your own data.'
  },
  {
    icon: BellRing,
    title: 'Smart Alerts',
    desc: 'Native push notifications when budgets near their limit, bills come due, or spending looks unusual.'
  },
  {
    icon: FileDown,
    title: 'PDF & Excel Reports',
    desc: 'One-click branded PDF reports and spreadsheet exports of any filtered view of your transactions.'
  }
];

const STEPS = [
  { n: '01', title: 'Speak or snap', desc: 'Add expenses by voice, text, or receipt photo — whichever is fastest in the moment.' },
  { n: '02', title: 'AI organizes', desc: 'Gemini classifies every entry into 9 categories and keeps your history searchable in plain language.' },
  { n: '03', title: 'You save more', desc: 'Budgets, alerts, insights, and a financial health score keep your money working for you.' }
];

export default function Landing() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0b0b17] text-white">
      {/* ------- NAV ------- */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0b0b17]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2 shadow-lg shadow-indigo-500/30">
              <Mic size={18} className="text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">FinVoice</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="btn-shine rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ------- HERO ------- */}
      <section className="relative flex min-h-screen items-center pt-24 pb-16">
        {/* gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
          <div className="animate-blob animation-delay-3s absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/25 blur-3xl" />
          <div className="animate-blob animation-delay-6s absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="landing-grid absolute inset-0 opacity-40" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300"
            >
              <Sparkles size={13} /> Powered by Gemini AI
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
            >
              Speak it.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Track it. Save it.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg"
            >
              FinTrack AI is the expense tracker that listens. Log spending with your voice,
              scan receipts with AI, and let a personal financial coach keep your budgets honest.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/register"
                className="btn-shine group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-7 py-3.5 text-sm font-bold shadow-xl shadow-indigo-500/40 transition-transform hover:scale-105 active:scale-95"
              >
                Start tracking free
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-bold text-white/85 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                I have an account
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-white/50"
            >
              <span className="flex items-center gap-1.5"><Languages size={14} /> English · हिंदी · తెలుగు</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> JWT secured</span>
              <span className="flex items-center gap-1.5"><CloudUpload size={14} /> Cloud synced</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
            className="flex justify-center lg:justify-end"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      {/* ------- FEATURES ------- */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything your money needs,
              <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent"> in one place</span>
            </h2>
            <p className="mt-4 text-white/60">
              Nine spending categories, three languages, one AI brain watching the details so you don't have to.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
              >
                <TiltCard maxTilt={6} className="perspective-1200 h-full">
                  <div className="preserve-3d group h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/[0.07]">
                    <div
                      className="inline-flex rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3 shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-110"
                      style={{ transform: 'translateZ(30px)' }}
                    >
                      <f.icon size={20} className="text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold" style={{ transform: 'translateZ(20px)' }}>{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55" style={{ transform: 'translateZ(12px)' }}>{f.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------- STATS ------- */}
      <section className="relative border-y border-white/5 bg-white/[0.02] py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 text-center sm:grid-cols-4 sm:px-6">
          {[
            { target: 9, suffix: '', label: 'Smart categories' },
            { target: 3, suffix: '', label: 'Voice languages' },
            { target: 24, suffix: '/7', label: 'AI coach on call' },
            { target: 100, suffix: '%', label: 'Cloud synced' }
          ].map(s => (
            <div key={s.label}>
              <p className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-4xl font-extrabold text-transparent">
                <Counter target={s.target} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/45">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------- HOW IT WORKS ------- */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Three steps to calmer money
          </motion.h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7"
              >
                <span className="bg-gradient-to-br from-indigo-400 to-fuchsia-500 bg-clip-text text-5xl font-extrabold text-transparent">{s.n}</span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------- CTA ------- */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute left-1/4 top-0 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="animate-blob animation-delay-3s absolute right-1/4 bottom-0 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <div className="mx-auto inline-flex rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 shadow-xl shadow-indigo-500/30">
            <Wallet size={24} className="text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Your money, finally listening
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Create a free account and log your first expense with nothing but your voice.
          </p>
          <Link
            to="/register"
            className="btn-shine group mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-9 py-4 text-base font-bold shadow-xl shadow-indigo-500/40 transition-transform hover:scale-105 active:scale-95"
          >
            Create free account
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      {/* ------- FOOTER ------- */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-white/40 sm:flex-row sm:px-6">
          <span className="flex items-center gap-2 font-semibold">
            <Mic size={13} /> FinVoice — FinTrack AI
          </span>
          <span>Built with React, Express, MongoDB & Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
