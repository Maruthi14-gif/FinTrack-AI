import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Trash2, CalendarDays, ReceiptText, Sparkles, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export default function Transactions() {
  const { user } = useAuth();
  
  // State variables for list
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Query param states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // AI query states
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Healthcare', 'Investments', 'Others'];

  useEffect(() => {
    fetchTransactions();
  }, [search, category, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder, page, limit]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', {
        params: {
          search: search || undefined,
          category: category || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount !== '' ? Number(minAmount) : undefined,
          maxAmount: maxAmount !== '' ? Number(maxAmount) : undefined,
          sortBy,
          sortOrder,
          page,
          limit
        }
      });
      setExpenses(res.data.expenses);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIQuery = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    try {
      const res = await api.post('/ai/query', { text: aiQuery });
      const filter = res.data.filter;

      // Map parsed filter parameters to UI state
      setSearch(filter.search || '');
      setCategory(filter.category || '');
      setStartDate(filter.startDate || '');
      setEndDate(filter.endDate || '');
      setMinAmount(filter.minAmount !== undefined ? String(filter.minAmount) : '');
      setMaxAmount(filter.maxAmount !== undefined ? String(filter.maxAmount) : '');
      setPage(1);
    } catch (error) {
      console.error('AI query translation failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setAiQuery('');
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/expenses', {
        params: {
          search: search || undefined,
          category: category || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount !== '' ? Number(minAmount) : undefined,
          maxAmount: maxAmount !== '' ? Number(maxAmount) : undefined,
          sortBy,
          sortOrder,
          page: 1,
          limit: 100000
        }
      });
      
      const allExpenses = res.data.expenses;
      if (!allExpenses || allExpenses.length === 0) {
        alert('No transactions found to export.');
        return;
      }

      const headers = ['Date', 'Item Name', 'Category', `Amount (${user?.currency || 'INR'})`, 'Description'];
      const csvRows = [
        headers.join(','),
        ...allExpenses.map(exp => {
          const dateVal = exp.date || '';
          const itemVal = `"${(exp.item || '').replace(/"/g, '""')}"`;
          const categoryVal = `"${(exp.category || '').replace(/"/g, '""')}"`;
          const amountVal = exp.amount || 0;
          const descVal = `"${(exp.description || '').replace(/"/g, '""')}"`;
          return [dateVal, itemVal, categoryVal, amountVal, descVal].join(',');
        })
      ];

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finvoice-expenses-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Error exporting CSV file.');
    }
  };

  const formatCurrency = (val) => {
    const symbol = user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';
    return `${symbol}${val?.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-1">Search, filter, and inspect your logs</p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={loading || expenses.length === 0}
          className="flex items-center gap-1.5 rounded-xl cursor-pointer self-start sm:self-auto bg-primary text-primary-foreground font-semibold px-4 h-9 shadow-md text-xs md:text-sm"
        >
          <Download size={16} /> Export CSV
        </Button>
      </header>

      {/* AI Query Search Bar */}
      <Card className="shadow-md border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <form onSubmit={handleAIQuery} className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary">
                <Sparkles size={16} className="animate-pulse" />
              </span>
              <input
                type="text"
                placeholder='AI Query... e.g. "Show expenses above 1000", "Show petrol expenses", "Show food expenses last week"'
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                disabled={aiLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-primary/25 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm shadow-sm placeholder:text-muted-foreground/60"
              />
            </div>
            <Button
              type="submit"
              disabled={aiLoading || !aiQuery.trim()}
              className="py-2.5 h-auto rounded-xl cursor-pointer"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span className="hidden sm:inline ml-1.5">{aiLoading ? 'Translating...' : 'AI Filter'}</span>
            </Button>
            {(search || category || startDate || endDate || minAmount || maxAmount) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="py-2.5 h-auto rounded-xl cursor-pointer"
              >
                Reset
              </Button>
            )}
          </form>

          {/* Active Min/Max Indicators */}
          {(minAmount !== '' || maxAmount !== '') && (
            <div className="flex gap-2 pt-1 flex-wrap">
              {minAmount !== '' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/15">
                  Min Amount: {formatCurrency(Number(minAmount))}
                </span>
              )}
              {maxAmount !== '' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/15">
                  Max Amount: {formatCurrency(Number(maxAmount))}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card className="shadow-sm border-primary/10 bg-card/40 backdrop-blur-sm">
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            
            {/* Search Input */}
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Search Item</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Uber"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Category</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Filter size={16} />
                </span>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm appearance-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Start */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Start Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Date Range End */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">End Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between border-t border-border/40 pt-4">
            
            {/* Sorting */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-0 font-semibold text-primary focus:outline-none text-xs cursor-pointer"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="item">Item Name</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-transparent border-0 font-semibold text-primary focus:outline-none text-xs cursor-pointer"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Total count and page size */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
              <span>Found: {totalItems} items</span>
              <div className="flex items-center gap-1">
                <span>Page Size:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-transparent border-0 font-semibold text-primary focus:outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card className="shadow-md border-primary/5">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <ReceiptText size={48} className="mx-auto opacity-35" />
              <p className="font-semibold text-sm">No transactions found matching your filters</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Expense Item</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                <AnimatePresence mode="popLayout">
                  {expenses.map((exp) => (
                    <motion.tr
                      key={exp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-muted/15 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-foreground">{exp.item}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(exp.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CalendarDays size={14} className="text-muted-foreground/75" />
                          {exp.date}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground truncate max-w-[180px]" title={exp.description}>
                        {exp.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <div className="text-xs text-muted-foreground font-medium">
              Showing page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3"
              >
                <ChevronLeft size={16} className="mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3"
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
