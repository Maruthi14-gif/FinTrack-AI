import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Insights() {
    const [insight, setInsight] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/analytics/insights');
                setInsight(res.data.insight);
            } catch (error) {
                console.error("Failed to fetch insight:", error);
                setInsight("Unable to generate insights at this moment. Have you set the GEMINI_API_KEY?");
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 p-4 rounded-3xl flex items-start gap-4 animate-pulse">
                <Sparkles className="text-indigo-400 mt-1 shrink-0" size={20} />
                <div className="flex items-center gap-2 text-indigo-200 font-medium">
                    <Loader2 size={16} className="animate-spin" /> Analyzing your spending...
                </div>
            </div>
        );
    }

    if (!insight) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 p-5 rounded-3xl flex items-start gap-4 shadow-sm shadow-indigo-500/5">
            <Sparkles className="text-indigo-400 mt-1 shrink-0 animate-pulse" size={24} />
            <p className="text-indigo-100 leading-relaxed text-sm md:text-base font-medium">{insight}</p>
        </div>
    );
}
