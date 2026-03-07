import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Download, AlertTriangle, FileText, Globe, Layers, Brain, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { scanService } from '../../services/scanService';

export const Report = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = searchParams.get('id');

    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchScan = async () => {
            try {
                setLoading(true);
                let data;
                if (id) {
                    data = await scanService.getScanDetails(id);
                } else {
                    data = await scanService.getLatestScan();
                    if (!data) throw new Error("No recent scans found");
                }
                setScanData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchScan();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 size={48} className="text-accent animate-spin" />
                <p className="text-body">Loading comprehensive report...</p>
            </div>
        );
    }

    if (error || !scanData) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="text-red-400" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-heading">Report Not Found</h2>
                <p className="text-body max-w-md text-center">
                    {error || "We couldn't locate the requested analysis report."}
                </p>
                <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
            </div>
        );
    }

    const sim = Math.min(100, Math.round(scanData.similarity || 0));
    const aiScore = Math.min(100, Math.round(scanData.aiScore || 0));

    const chartData = [
        { name: 'Original Context', value: Math.max(0, 100 - sim - (aiScore * 0.3)), color: '#10B981' },
        { name: 'Lexical Match', value: Math.floor(sim * 0.5), color: '#F59E0B' },
        { name: 'Semantic Rewrite', value: Math.ceil(sim * 0.5), color: '#EF4444' },
        { name: 'AI Prediction', value: aiScore, color: '#8B5CF6' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-heading mb-2">Analysis Report</h1>
                    <p className="text-body">{scanData.filename} • {scanData.words?.toLocaleString() || 0} words</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download size={18} />
                    Export PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Circular Score Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                        <GlassCard className="p-8 text-center flex flex-col items-center justify-center">
                            <h3 className="text-lg font-bold text-heading mb-6 w-full text-left">Plagiarism Score</h3>

                            <div className="w-48 h-48 relative mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.filter(d => d.name !== 'AI Prediction')}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.filter(d => d.name !== 'AI Prediction').map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgb(var(--color-card))', borderColor: 'rgb(var(--color-border))', borderRadius: '12px', color: 'rgb(var(--color-heading))' }}
                                            itemStyle={{ color: 'rgb(var(--color-heading))' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className={`text-4xl font-black ${sim > 30 ? 'text-red-400' : sim > 15 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                        {sim}%
                                    </span>
                                    <span className="text-xs text-muted uppercase tracking-wider font-semibold">Flagged</span>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-8 text-center flex flex-col items-center justify-center border-purple-500/20">
                            <h3 className="text-lg font-bold text-heading mb-6 w-full text-left">AI Content Score</h3>

                            <div className="w-48 h-48 relative mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Human', value: 100 - aiScore, color: '#10B981' },
                                                { name: 'AI', value: aiScore, color: '#8B5CF6' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell fill="#10B981" />
                                            <Cell fill="#8B5CF6" />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className={`text-4xl font-black ${aiScore > 50 ? 'text-purple-400' : aiScore > 20 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                        {aiScore}%
                                    </span>
                                    <span className="text-xs text-muted uppercase tracking-wider font-semibold">AI Prob</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {sim > 20 ? (
                        <GlassCard className="border-red-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-400 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-heading font-semibold mb-1">High Risk Detected</h4>
                                    <p className="text-sm text-body">Significant overlap with existing internet sources detected.</p>
                                </div>
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard className="border-emerald-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-emerald-400 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-heading font-semibold mb-1">Analysis Clean</h4>
                                    <p className="text-sm text-body">This document exhibits very low similarity. High probability of original content.</p>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    <GlassCard className="p-6">
                        <h3 className="text-heading font-bold mb-4">Matched Sources</h3>
                        <div className="space-y-4">
                            {scanData.sources && scanData.sources.map((source, i) => (
                                <div key={i} className="flex items-center justify-between text-sm border-b border-borderLight pb-2 last:border-0 last:pb-0">
                                    <a href={source.link} className="text-accent hover:underline truncate max-w-[150px]">
                                        {source.name}
                                    </a>
                                    <span className="text-body">{source.match}% match</span>
                                </div>
                            ))}
                            {(!scanData.sources || scanData.sources.length === 0) && (
                                <p className="text-muted text-sm">No significant sources matched.</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Text Viewer */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="h-full flex flex-col">
                        <div className="flex items-center justify-between border-b border-borderLight pb-4 mb-4">
                            <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                                <FileText size={20} className="text-accent" /> Document Viewer
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-yellow-500/15 text-yellow-500 rounded-lg text-xs font-semibold">Lexical</span>
                                <span className="px-2 py-1 bg-red-500/15 text-red-500 rounded-lg text-xs font-semibold">Semantic</span>
                                <span className="px-2 py-1 bg-purple-500/15 text-purple-500 rounded-lg text-xs font-semibold">AI Predict</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-4 text-body text-sm leading-relaxed custom-scrollbar min-h-[500px]">
                            {scanData.plagiarismResult && scanData.plagiarismResult.results ? (
                                scanData.plagiarismResult.results.map((result, index) => {
                                    const sim = result.maxSimilarity * 100;
                                    let highlightClass = "";
                                    let label = "";
                                    let colorClass = "";
                                    let Icon = Globe;

                                    if (sim > 45) {
                                        highlightClass = "bg-red-500/15 text-heading rounded-lg p-3 border-l-2 border-red-500 relative group cursor-pointer";
                                        label = "High Similarity";
                                        colorClass = "text-red-400";
                                        Icon = AlertTriangle;
                                    } else if (sim > 15) {
                                        highlightClass = "bg-yellow-500/15 text-heading rounded-lg p-3 border-l-2 border-yellow-500 relative group cursor-pointer";
                                        label = "Partial Match";
                                        colorClass = "text-yellow-400";
                                        Icon = Globe;
                                    }

                                    return (
                                        <p key={index} className={highlightClass}>
                                            {result.sentence}
                                            {highlightClass && (
                                                <span className="absolute top-full left-0 mt-2 w-64 p-3 bg-card border border-borderLight rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none block">
                                                    <span className={`text-xs ${colorClass} font-bold flex items-center gap-1 mb-1`}><Icon size={14} /> {label} ({Math.round(sim)}%)</span>
                                                    <span className="text-xs text-body">
                                                        Source: {result.sources?.[0]?.url ? (
                                                            (() => {
                                                                try {
                                                                    return new URL(result.sources[0].url).hostname;
                                                                } catch (e) {
                                                                    return result.sources[0].url || 'Unknown Source';
                                                                }
                                                            })()
                                                        ) : 'Database Match'}
                                                    </span>
                                                </span>
                                            )}
                                        </p>
                                    );
                                })
                            ) : (
                                <p>No detailed sentence analysis available for this report.</p>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
