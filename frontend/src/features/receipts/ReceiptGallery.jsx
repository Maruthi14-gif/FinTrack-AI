import { useState, useEffect } from 'react';
import { Search, Trash2, ZoomIn, X, Calendar, Camera, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function ReceiptGallery() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMerchant, setSearchMerchant] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'processed', 'failed'
  const [selectedReceipt, setSelectedReceipt] = useState(null); // receipt object for zoom modal

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/receipts');
      setReceipts(res.data);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // prevent opening zoom modal
    if (!window.confirm('Are you sure you want to delete this receipt? This will permanently delete both the database log and the file on the server.')) return;
    
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts(receipts.filter(r => r.id !== id));
      if (selectedReceipt?.id === id) {
        setSelectedReceipt(null);
      }
    } catch (err) {
      console.error('Failed to delete receipt:', err);
      alert('Error deleting receipt.');
    }
  };

  const getCurrencySymbol = () => {
    return user?.currency === 'USD' ? '$' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '₹';
  };

  const formatCurrency = (val) => {
    return `${getCurrencySymbol()}${val?.toLocaleString() || 0}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = (r.merchant || '').toLowerCase().includes(searchMerchant.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipt Gallery</h1>
          <p className="text-muted-foreground mt-1">Manage and audit your scanned physical receipts</p>
        </div>
        <Button
          onClick={fetchReceipts}
          variant="outline"
          className="flex items-center gap-1.5 rounded-xl cursor-pointer bg-card hover:bg-muted border border-border/80 h-9 text-xs md:text-sm px-3 self-start sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </header>

      {/* Filter and Search Controls */}
      <Card className="shadow-sm border-primary/10 bg-card/40 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by merchant name..."
              value={searchMerchant}
              onChange={(e) => setSearchMerchant(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background/50 border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed / Fallback</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <RefreshCw size={36} className="animate-spin text-primary" />
          <p className="font-semibold text-sm animate-pulse">Loading receipt documents...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card className="shadow-md border-primary/5 p-16 text-center text-muted-foreground space-y-3">
          <Camera size={48} className="mx-auto opacity-35" />
          <p className="font-semibold text-sm">No scanned receipts match your filters</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReceipts.map((receipt) => (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                onClick={() => setSelectedReceipt(receipt)}
                className="group relative bg-card/60 backdrop-blur-md rounded-2xl border border-border/80 hover:border-primary/30 shadow-sm hover:shadow-md transition-all p-3 cursor-pointer flex flex-col justify-between"
              >
                {/* Image Preview Thumbnail */}
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-zinc-950 flex items-center justify-center border border-border/40 group-hover:opacity-95 transition-opacity">
                  <img
                    src={receipt.imageUrl}
                    alt={receipt.merchant}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="p-2 rounded-full bg-background/80 text-foreground shadow">
                      <ZoomIn size={18} />
                    </span>
                  </div>
                </div>

                {/* Card Text & Metadata */}
                <div className="pt-3 text-left space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="font-bold text-sm text-foreground truncate max-w-[130px]" title={receipt.merchant}>
                      {receipt.merchant || 'Unknown Merchant'}
                    </h3>
                    
                    {/* Status badge */}
                    {receipt.status === 'processed' ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                        <CheckCircle size={10} /> Processed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive" title="Unprocessed or API error fallback logged">
                        <AlertTriangle size={10} /> Fallback
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(receipt.date)}
                    </span>
                    <span className="font-extrabold text-primary">
                      {formatCurrency(receipt.amount)}
                    </span>
                  </div>
                </div>

                {/* Hover Delete Action Trigger */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(receipt.id, e)}
                  className="absolute top-5 right-5 bg-background/85 hover:bg-background text-muted-foreground hover:text-destructive p-1.5 rounded-xl shadow-lg border border-border/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Glassmorphic Zoom Modal Overlay */}
      <AnimatePresence>
        {selectedReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReceipt(null)}
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside card
              className="bg-card/75 border border-primary/10 rounded-3xl shadow-2xl p-4 max-w-lg w-full max-h-[85vh] overflow-y-auto flex flex-col justify-between relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 bg-secondary/80 hover:bg-secondary text-foreground p-1.5 rounded-full border border-border/60 transition-colors cursor-pointer z-10"
              >
                <X size={18} />
              </button>

              {/* Modal Image View */}
              <div className="rounded-2xl overflow-hidden border border-border bg-zinc-950 flex items-center justify-center max-h-[55vh]">
                <img
                  src={selectedReceipt.imageUrl}
                  alt={selectedReceipt.merchant}
                  className="max-h-[55vh] object-contain w-full"
                />
              </div>

              {/* Audit Details */}
              <div className="pt-4 text-left space-y-3">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <div>
                    <h2 className="text-xl font-black">{selectedReceipt.merchant || 'Unknown Merchant'}</h2>
                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                      <Calendar size={14} /> Uploaded on {formatDate(selectedReceipt.createdAt)}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wide block">Scan Date</span>
                    <span className="text-foreground mt-0.5 block">{formatDate(selectedReceipt.date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wide block">Extraction Status</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full mt-0.5 text-[10px] ${selectedReceipt.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                      {selectedReceipt.status === 'processed' ? 'Processed Successfully' : 'Offline / Failed Fallback'}
                    </span>
                  </div>
                </div>

                {selectedReceipt.rawText && (
                  <div className="pt-1 text-xs">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wide block mb-1">Extracted Text Summary / JSON</span>
                    <pre className="bg-muted/40 border border-border/60 rounded-xl p-3 max-h-36 overflow-y-auto text-left font-mono leading-relaxed whitespace-pre-wrap">
                      {selectedReceipt.rawText}
                    </pre>
                  </div>
                )}

                <Button
                  onClick={(e) => handleDelete(selectedReceipt.id, e)}
                  variant="destructive"
                  className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow mt-2"
                >
                  <Trash2 size={16} /> Delete Receipt File
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
