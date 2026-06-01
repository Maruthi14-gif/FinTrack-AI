import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Loader2, CheckCircle2, Languages, PlusCircle, Sparkles, AlertCircle, UploadCloud, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import api from '../lib/api';

export default function VoiceExpenseInput() {
  const [activeTab, setActiveTab] = useState('voice'); // 'voice', 'receipt', or 'manual'
  const [lang, setLang] = useState('en-IN'); // 'en-IN', 'hi-IN', 'te-IN'
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [typedCommand, setTypedCommand] = useState('');

  // Manual Form State
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Receipt Scanner State
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptMimeType, setReceiptMimeType] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedReceipt, setParsedReceipt] = useState(null);
  const [saveMode, setSaveMode] = useState('combined');
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Edited receipt fields
  const [receiptMerchant, setReceiptMerchant] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptCategory, setReceiptCategory] = useState('Food');
  const [receiptDesc, setReceiptDesc] = useState('');
  const [receiptLineItems, setReceiptLineItems] = useState([]);
  const [receiptSaving, setReceiptSaving] = useState(false);

  const fileInputRef = useRef(null);

  const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Entertainment', 'Healthcare', 'Investments', 'Others'];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    if (!listening && transcript.length > 3 && !isProcessing && !resultMessage && activeTab === 'voice' && browserSupportsSpeechRecognition) {
      handleProcessExpense(transcript);
    }
  }, [listening, transcript]);

  const handleToggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      setResultMessage(null);
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false, language: lang });
    }
  };

  const handleProcessExpense = async (textToParse) => {
    if (!textToParse) return;
    setIsProcessing(true);
    setResultMessage(null);
    
    try {
      const response = await api.post('/expenses/parse', { text: textToParse });
      const expenses = response.data.expenses;
      
      if (expenses && expenses.length > 0) {
        const exp = expenses[0];
        setResultMessage({ 
          type: 'success', 
          text: `Added: ${exp.item} (${exp.category}) - ₹${exp.amount}` 
        });
        setTypedCommand('');
      } else {
        setResultMessage({ type: 'success', text: 'Expense logged successfully!' });
      }

      setTimeout(() => {
        setResultMessage(null);
        resetTranscript();
      }, 5000);
    } catch (error) {
      setResultMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to process command.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!item || !amount || !date) {
      setResultMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setManualLoading(true);
    setResultMessage(null);

    try {
      await api.post('/expenses', {
        item,
        amount: Number(amount),
        category,
        date,
        description
      });

      setResultMessage({ type: 'success', text: `Successfully saved ₹${amount} for ${item}!` });
      setItem('');
      setAmount('');
      setDescription('');
      
      setTimeout(() => {
        setResultMessage(null);
      }, 3000);
    } catch (error) {
      setResultMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save expense.' 
      });
    } finally {
      setManualLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setResultMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    
    setReceiptMimeType(file.type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
      setReceiptImage(reader.result);
      setParsedReceipt(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResultMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }

    setReceiptMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
      setReceiptImage(reader.result);
      setParsedReceipt(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptImage(null);
    setReceiptMimeType('');
    setReceiptPreview(null);
    setParsedReceipt(null);
    setResultMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScanReceipt = async () => {
    if (!receiptImage) return;
    setIsScanning(true);
    setResultMessage(null);
    setParsedReceipt(null);

    try {
      const response = await api.post('/ai/parse-receipt', {
        image: receiptImage,
        mimeType: receiptMimeType
      });

      const data = response.data;
      setParsedReceipt(data);
      setReceiptMerchant(data.merchant || '');
      setReceiptAmount(data.totalAmount || 0);
      setReceiptDate(data.date || new Date().toISOString().split('T')[0]);
      setReceiptCategory(data.category || 'Others');
      setReceiptDesc(data.description || '');
      setReceiptLineItems(data.lineItems || []);
      
      if (data.lineItems) {
        setSelectedItems(data.lineItems.map((_, index) => index));
      }
      
      if (data.warning) {
        setResultMessage({ type: 'error', text: data.warning });
      } else {
        setResultMessage({ type: 'success', text: 'Receipt parsed successfully!' });
        setTimeout(() => {
          setResultMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Scan error:', error);
      setResultMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to scan receipt.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveReceiptExpense = async (e) => {
    e.preventDefault();
    setReceiptSaving(true);
    setResultMessage(null);

    try {
      if (saveMode === 'combined') {
        if (!receiptAmount || !receiptMerchant || !receiptDate) {
          setResultMessage({ type: 'error', text: 'Please fill in Merchant, Amount, and Date.' });
          setReceiptSaving(false);
          return;
        }

        await api.post('/expenses', {
          item: receiptMerchant,
          amount: Number(receiptAmount),
          category: receiptCategory,
          date: receiptDate,
          description: receiptDesc || `Receipt scan combined expense from ${receiptMerchant}.`
        });
        
        setResultMessage({ type: 'success', text: `Saved ₹${receiptAmount} for ${receiptMerchant}!` });
      } else {
        if (selectedItems.length === 0) {
          setResultMessage({ type: 'error', text: 'Please select at least one line item to save.' });
          setReceiptSaving(false);
          return;
        }

        const promises = selectedItems.map(idx => {
          const item = receiptLineItems[idx];
          return api.post('/expenses', {
            item: item.item,
            amount: Number(item.amount),
            category: item.category,
            date: receiptDate,
            description: `Line item from ${receiptMerchant} receipt.`
          });
        });

        await Promise.all(promises);
        setResultMessage({ type: 'success', text: `Saved ${selectedItems.length} items from ${receiptMerchant}!` });
      }

      handleRemoveReceipt();
    } catch (error) {
      console.error('Save error:', error);
      setResultMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save receipt expenses.'
      });
    } finally {
      setReceiptSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl border-primary/10 bg-card/65 backdrop-blur-xl rounded-3xl overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-primary via-indigo-400 to-blue-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Sparkles className="text-primary animate-pulse" size={24} /> Log Expense
        </CardTitle>
        <CardDescription>
          Record expenses instantly via AI Voice, Receipt Scanner, or manual entry
        </CardDescription>

        {/* Tab Selector */}
        <div className="flex bg-muted/60 p-1 rounded-xl mt-6 border border-border/40">
          <button
            type="button"
            onClick={() => { setActiveTab('voice'); setResultMessage(null); }}
            className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'voice' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Mic size={15} /> Voice
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('receipt'); setResultMessage(null); }}
            className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'receipt' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FileText size={15} /> Receipt Scan
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('manual'); setResultMessage(null); }}
            className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <PlusCircle size={15} /> Manual
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'voice' ? (
            <motion.div
              key="voice-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center space-y-6 w-full"
            >
              {browserSupportsSpeechRecognition ? (
                <>
                  <div className="flex items-center gap-2.5 bg-muted/50 px-4 py-2 rounded-xl border border-border/40">
                    <Languages size={16} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voice Language:</span>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                      className="bg-transparent text-sm font-bold text-primary focus:outline-none cursor-pointer"
                    >
                      <option value="en-IN" className="bg-background">English (🇮🇳)</option>
                      <option value="hi-IN" className="bg-background">Hindi (🇮🇳)</option>
                      <option value="te-IN" className="bg-background">Telugu (🇮🇳)</option>
                    </select>
                  </div>

                  <div className="relative flex items-center justify-center w-44 h-44 mt-4">
                    <AnimatePresence>
                      {listening && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: [1, 1.25, 1], scale: [1, 1.3, 1] }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                        />
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={handleToggleListening}
                      disabled={isProcessing}
                      className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl cursor-pointer ${
                        listening ? 'bg-primary text-primary-foreground shadow-primary/45 animate-pulse' : 
                        isProcessing ? 'bg-muted text-muted-foreground' : 
                        'bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:shadow-lg'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 size={36} className="animate-spin" />
                      ) : listening ? (
                        <Mic size={42} />
                      ) : (
                        <MicOff size={38} className="opacity-80" />
                      )}
                    </button>
                  </div>

                  <div className="w-full min-h-28 bg-muted/30 p-5 rounded-2xl border border-border/40 flex items-center justify-center text-center relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {resultMessage ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className={`flex flex-col items-center gap-2 p-2 ${resultMessage.type === 'success' ? 'text-green-500' : 'text-destructive'}`}
                        >
                          <CheckCircle2 size={28} />
                          <span className="font-semibold text-sm md:text-base">{resultMessage.text}</span>
                        </motion.div>
                      ) : (
                        <motion.p
                          key="transcript"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-base font-semibold text-foreground/80 italic leading-relaxed"
                        >
                          {transcript || (listening ? "Listening to your voice..." : "Tap the mic and speak naturally")}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="text-center text-xs text-muted-foreground max-w-sm pt-2">
                    <span className="font-semibold block mb-1">Try saying:</span>
                    <span className="italic">"I spent 250 rupees on dinner"</span> or <span className="italic">"రైలు టికెట్ కోసం 1200 రూపాయలు ఖర్చు పెట్టాను"</span>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-4 pt-2">
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3.5 text-xs text-center flex items-center justify-center gap-2.5 mb-2 leading-relaxed">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>Voice recording is not supported in this browser (or disabled). You can still type commands to the AI below, or use the <strong>Manual Form</strong> tab!</span>
                  </div>

                  {resultMessage && (
                    <div className={`p-3 rounded-xl border text-sm text-center flex items-center justify-center gap-2 ${resultMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                      {resultMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span className="font-medium">{resultMessage.text}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="natural-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Type Natural Command</Label>
                    <textarea
                      id="natural-input"
                      value={typedCommand}
                      onChange={(e) => setTypedCommand(e.target.value)}
                      placeholder='e.g., "Spent 1200 for petrol" or "రైలు టికెట్ కోసం 1200 రూపాయలు ఖర్చు పెట్టాను"'
                      className="w-full bg-background border border-input rounded-xl p-3.5 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none leading-relaxed"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleProcessExpense(typedCommand)}
                    disabled={isProcessing || !typedCommand.trim()}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl shadow-lg shadow-primary/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>{isProcessing ? 'Processing with Gemini AI...' : 'Parse and Save'}</span>
                  </Button>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'receipt' ? (
            <motion.div
              key="receipt-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {resultMessage && (
                <div className={`p-3 rounded-xl border text-sm text-center flex items-center justify-center gap-2 ${resultMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                  {resultMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span className="font-medium">{resultMessage.text}</span>
                </div>
              )}

              {!receiptPreview && !isScanning && !parsedReceipt && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-all group flex flex-col items-center justify-center space-y-3 bg-muted/10 hover:bg-muted/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud size={40} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or JPEG receipt images</p>
                  </div>
                </div>
              )}

              {receiptPreview && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-border/80 max-h-64 flex items-center justify-center bg-zinc-950">
                    <img
                      src={receiptPreview}
                      alt="Receipt Preview"
                      className="max-h-64 object-contain opacity-85"
                    />
                    
                    {!isScanning && !parsedReceipt && (
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="absolute top-2 right-2 bg-background/80 hover:bg-background text-foreground hover:text-destructive p-1.5 rounded-full shadow transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}

                    {isScanning && (
                      <>
                        <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                        <div className="absolute left-0 w-full h-1 bg-primary shadow-lg shadow-primary/80 animate-scan-receipt"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-xs">
                          <Loader2 size={36} className="animate-spin text-primary mb-2" />
                          <p className="text-sm font-bold text-foreground drop-shadow-md">Gemini AI OCR scanning...</p>
                        </div>
                      </>
                    )}
                  </div>

                  {!isScanning && !parsedReceipt && (
                    <Button
                      type="button"
                      onClick={handleScanReceipt}
                      className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles size={16} className="animate-pulse" />
                      <span>Analyze Receipt with Gemini</span>
                    </Button>
                  )}
                </div>
              )}

              {parsedReceipt && !isScanning && (
                <form onSubmit={handleSaveReceiptExpense} className="space-y-4">
                  <div className="flex justify-between items-center bg-muted/40 p-2 rounded-xl border border-border/60">
                    <span className="text-xs font-semibold text-muted-foreground uppercase px-2">Import Option</span>
                    <div className="flex bg-muted rounded-lg p-0.5 border border-border/20">
                      <button
                        type="button"
                        onClick={() => setSaveMode('combined')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${saveMode === 'combined' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}`}
                      >
                        Single Combined
                      </button>
                      <button
                        type="button"
                        disabled={receiptLineItems.length === 0}
                        onClick={() => setSaveMode('split')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer disabled:opacity-50 ${saveMode === 'split' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}`}
                      >
                        Split Items
                      </button>
                    </div>
                  </div>

                  {saveMode === 'combined' ? (
                    <div className="space-y-3 p-3 bg-muted/15 border border-border/30 rounded-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <Label htmlFor="receipt-merchant" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Merchant</Label>
                          <Input
                            id="receipt-merchant"
                            value={receiptMerchant}
                            onChange={(e) => setReceiptMerchant(e.target.value)}
                            className="bg-background/50 h-9"
                            required
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <Label htmlFor="receipt-amount" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Amount (₹)</Label>
                          <Input
                            id="receipt-amount"
                            type="number"
                            value={receiptAmount}
                            onChange={(e) => setReceiptAmount(e.target.value)}
                            className="bg-background/50 h-9"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <Label htmlFor="receipt-category" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Category</Label>
                          <select
                            id="receipt-category"
                            value={receiptCategory}
                            onChange={(e) => setReceiptCategory(e.target.value)}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-9"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <Label htmlFor="receipt-date" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Date</Label>
                          <Input
                            id="receipt-date"
                            type="date"
                            value={receiptDate}
                            onChange={(e) => setReceiptDate(e.target.value)}
                            className="bg-background/50 h-9"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="receipt-desc" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Description (Optional)</Label>
                        <textarea
                          id="receipt-desc"
                          value={receiptDesc}
                          onChange={(e) => setReceiptDesc(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[50px] resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="split-receipt-date" className="text-xs font-semibold text-muted-foreground uppercase block px-0.5">Transaction Date</Label>
                        <Input
                          id="split-receipt-date"
                          type="date"
                          value={receiptDate}
                          onChange={(e) => setReceiptDate(e.target.value)}
                          className="bg-background/50 h-9"
                          required
                        />
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block px-1 text-left">Select items to import:</span>
                        {receiptLineItems.map((li, index) => {
                          const isChecked = selectedItems.includes(index);
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedItems(selectedItems.filter(i => i !== index));
                                } else {
                                  setSelectedItems([...selectedItems, index]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary/45' : 'bg-muted/20 border-border/40 hover:bg-muted/40'}`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // handled by parent div click
                                  className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer h-4 w-4"
                                />
                                <div className="text-left">
                                  <p className="text-xs font-bold">{li.item}</p>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{li.category}</span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-primary">₹{li.amount}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveReceipt}
                      className="flex-1 py-3 font-semibold rounded-xl cursor-pointer"
                    >
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      disabled={receiptSaving}
                      className="flex-[2] py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {receiptSaving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>{receiptSaving ? 'Saving...' : saveMode === 'combined' ? 'Save Combined' : `Save ${selectedItems.length} Items`}</span>
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="manual-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {resultMessage && (
                  <div className={`p-3 rounded-xl border text-sm text-center flex items-center justify-center gap-2 ${resultMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                    {resultMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="font-medium">{resultMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="item" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Item Name</Label>
                    <Input
                      id="item"
                      placeholder="e.g. Groceries, Fuel"
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      className="bg-background/40"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="e.g. 250"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-background/40"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Category</Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-background/40"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block px-0.5">Description (Optional)</Label>
                  <textarea
                    id="description"
                    placeholder="Add details like merchant or notes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[80px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/10 transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
                >
                  {manualLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{manualLoading ? 'Saving...' : 'Save Expense'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
