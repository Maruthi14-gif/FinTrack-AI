import React, { useState } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExpenseInput() {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    React.useEffect(() => {
        if (listening) {
            setText(transcript);
        }
    }, [transcript, listening]);

    const toggleListen = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!text.trim()) return;

        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const res = await axios.post('http://localhost:5000/api/expenses/parse', { text });
            setSuccessMsg(`Added ${res.data.expenses.length} expense(s) successfully!`);
            setText('');
            resetTranscript();
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Failed to parse expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full pt-8">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Log Expense</h2>
                <p className="text-slate-400 mt-2 text-sm">Type or speak your expense naturally.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={loading}
                        placeholder='e.g., "I spent 200 on groceries today and 50 on auto"'
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[120px] shadow-inner"
                    />

                    {browserSupportsSpeechRecognition && (
                        <button
                            type="button"
                            onClick={toggleListen}
                            className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${listening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700'}`}
                            title={listening ? 'Stop recording' : 'Start recording'}
                        >
                            {listening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    )}
                </div>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> {successMsg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 size={18} className="animate-spin" /> Processing...</>
                    ) : (
                        <><Send size={18} /> Add Expense</>
                    )}
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-500 mb-3 text-left">Examples you can try:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">"Paid 80 for tea"</span>
                    <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">"Bought shoes for 1500"</span>
                    <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">"120 on lunch, 40 on snacks yesterday"</span>
                </div>
            </div>
        </div>
    );
}
