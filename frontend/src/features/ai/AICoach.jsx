import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, AlertCircle, TrendingUp, Info, HelpCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function AICoach() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'summary'
  const chatEndRef = useRef(null);

  // Chat State
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi ${user?.username || 'there'}, I am your AI Financial Coach. Ask me anything about your expenses or budgets, or use the quick queries below!` }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const sampleQuestions = [
    "How much did I spend this month?",
    "What is my highest spending category?",
    "Show my food expenses.",
    "How much did I spend last week?"
  ];

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    } else if (activeTab === 'summary' && !summaryData) {
      fetchSummary();
    }
  }, [activeTab, messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await api.get('/ai/summary');
      setSummaryData(res.data);
    } catch (err) {
      console.error(err);
      setSummaryError('Could not generate summary. Ensure you have logged expenses first.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    if (!textToSend) setInput('');

    // Append user message
    const userMsg = { role: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: queryText });
      const assistantMsg = { role: 'assistant', text: res.data.reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg = { role: 'assistant', text: 'Sorry, I encountered an error checking your financial data.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const symbol = user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';
    return `${symbol}${val?.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Financial Recovery Coach</h1>
        <p className="text-muted-foreground mt-1">Get custom savings suggestions, budget reports, and quick answers</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-muted/60 p-1 rounded-xl max-w-md border border-border/40">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Bot size={16} /> AI Chat assistant
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Sparkles size={16} /> Monthly Summary Review
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'chat' ? (
          <motion.div
            key="chat-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 md:grid-cols-4 items-start"
          >
            {/* Suggestions sidebar for desktop */}
            <div className="md:col-span-1 space-y-4">
              <Card className="shadow-sm border-primary/10 bg-card/45 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <HelpCircle size={16} /> Quick Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {sampleQuestions.map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => handleSend(q)}
                      disabled={chatLoading}
                      className="w-full text-left text-xs bg-background/50 hover:bg-primary/5 hover:text-primary transition-all p-3 rounded-xl border border-border/60 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="md:col-span-3">
              <Card className="shadow-lg border-primary/10 bg-card/55 backdrop-blur-xl h-[520px] flex flex-col rounded-3xl overflow-hidden relative">
                {/* Subtle border glow */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                <div className="flex-1 p-5 overflow-y-auto space-y-4 flex flex-col">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={index}
                        className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                            <Bot size={16} />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl p-4 text-sm leading-relaxed ${isUser ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/10' : 'bg-muted/70 text-foreground border border-border/40 shadow-sm'}`}
                          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    );
                  })}
                  {chatLoading && (
                    <div className="flex gap-3 max-w-[80%] self-start">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                        <Bot size={16} />
                      </div>
                      <div className="bg-muted/70 text-muted-foreground border border-border/40 text-sm rounded-2xl p-4 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Analyzing financial data...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Form Input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="p-4 border-t border-border/60 bg-background/50 flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Ask about highest category, total month spend..."
                    className="flex-1 bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !input.trim()}
                    className="h-auto px-4 cursor-pointer"
                  >
                    <Send size={16} />
                  </Button>
                </form>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <Loader2 size={40} className="animate-spin text-primary" />
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Running Monthly AI diagnostics...</p>
              </div>
            ) : summaryError ? (
              <Card className="border-dashed border-2 p-10 text-center">
                <CardContent className="space-y-3">
                  <AlertCircle size={40} className="mx-auto text-destructive opacity-80 animate-bounce" />
                  <h3 className="text-lg font-semibold">{summaryError}</h3>
                  <p className="text-xs text-muted-foreground">Add some expenses in the current month to allow the AI coach to review them.</p>
                  <Button onClick={fetchSummary} variant="outline" className="mt-2">Try Again</Button>
                </CardContent>
              </Card>
            ) : summaryData ? (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Spending Summary Card */}
                <Card className="col-span-3 md:col-span-1 shadow-md border-primary/10 bg-primary/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} className="text-primary animate-pulse" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-base text-primary uppercase font-bold tracking-wider">Month Summary</CardTitle>
                    <CardDescription>Generated by Gemini AI Review</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">Total Spent This Month</span>
                      <span className="text-4xl font-extrabold tracking-tight text-foreground block mt-1">{formatCurrency(summaryData.totalSpending)}</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block border-b border-border/40 pb-1">Top Spending Categories</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {summaryData.topCategories?.map(cat => (
                          <span key={cat} className="bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Observations & Suggestions */}
                <div className="col-span-3 md:col-span-2 space-y-6">
                  {/* Budget Performance */}
                  <Card className="shadow-sm border-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <Info size={18} className="text-primary" /> Budget Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed text-foreground/90 font-medium">
                      {summaryData.budgetPerformance}
                    </CardContent>
                  </Card>

                  {/* Observations */}
                  <Card className="shadow-sm border-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <TrendingUp size={18} className="text-primary" /> Spending Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <ul className="space-y-2.5">
                        {summaryData.observations?.map((obs, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground/80 font-medium">
                            <span className="text-primary mt-1">•</span> {obs}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations & Savings */}
                <Card className="col-span-3 shadow-md border-emerald-500/10 bg-emerald-500/5">
                  <CardHeader>
                    <CardTitle className="text-lg text-emerald-500 font-extrabold flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-500" /> AI Recovery Action Recommendations
                    </CardTitle>
                    <CardDescription className="text-emerald-500/80">Actionable advice to reduce debt and grow savings</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Savings Suggestions</h4>
                      <ul className="space-y-3">
                        {summaryData.savingsSuggestions?.map((sug, i) => (
                          <li key={i} className="bg-background/60 border border-emerald-500/10 rounded-xl p-3 text-sm font-semibold text-foreground/80">
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Budget Adjustments</h4>
                      <ul className="space-y-3">
                        {summaryData.spendingRecommendations?.map((rec, i) => (
                          <li key={i} className="bg-background/60 border border-indigo-500/10 rounded-xl p-3 text-sm font-semibold text-foreground/80">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
