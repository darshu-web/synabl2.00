import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Download, AlertTriangle, FileText, Globe, Layers, Brain, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { scanService } from '../../services/scanService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

export const Report = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const id = searchParams.get('id');

    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

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

    const handleExportPdf = async () => {
        if (!scanData) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let currentY = 20;

            // 1. Header
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('SYNABL ANALYSIS REPORT', 20, 25);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 32);

            currentY = 55;

            // 2. Document & Author Info
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('DOCUMENT DETAILS', 20, currentY);
            currentY += 10;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Filename: ${scanData.filename}`, 25, currentY);
            currentY += 7;
            doc.text(`Author: ${user?.name || 'Authorized User'}`, 25, currentY);
            currentY += 7;
            doc.text(`Word Count: ${scanData.words?.toLocaleString() || 0} words`, 25, currentY);
            currentY += 15;

            // 3. SCORE SUMMARY BOXES
            doc.setDrawColor(226, 232, 240);
            doc.rect(20, currentY, (pageWidth - 50) / 2, 35);
            doc.rect(pageWidth / 2 + 5, currentY, (pageWidth - 50) / 2, 35);

            // Plagiarism Box
            doc.setFont('helvetica', 'bold');
            doc.text('PLAGIARISM SCORE', 25, currentY + 10);
            doc.setFontSize(24);
            doc.setTextColor(sim > 30 ? 239 : 16, sim > 30 ? 68 : 185, sim > 30 ? 68 : 129); // Red or Emerald
            doc.text(`${sim}%`, 25, currentY + 25);

            // AI Box
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.text('AI PROBABILITY', pageWidth / 2 + 10, currentY + 10);
            doc.setFontSize(24);
            doc.setTextColor(139, 92, 246); // Purple
            doc.text(`${aiScore}%`, pageWidth / 2 + 10, currentY + 25);

            currentY += 50;

            // 4. FULL TEXT WITH HIGHLIGHTS
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('ANALYZED CONTENT', 20, currentY);
            currentY += 10;

            const results = scanData.plagiarismResult?.results || [];
            if (results.length > 0) {
                results.forEach((item, idx) => {
                    const sentence = item.sentence;
                    if (!sentence) return;

                    const sSim = (item.maxSimilarity || item.similarity || 0) * 100;
                    const splitText = doc.splitTextToSize(String(sentence), pageWidth - 40);
                    const blockHeight = (splitText.length * 5) + 2;

                    // Check for page overflow
                    if (currentY + blockHeight > 270) {
                        doc.addPage();
                        currentY = 20;
                    }

                    if (sSim > 15) {
                        // Background Highlight (Turnitin Style)
                        doc.setGState(new doc.GState({ opacity: 0.15 }));
                        if (sSim > 45) {
                            doc.setFillColor(239, 68, 68); // Red
                            doc.setTextColor(185, 28, 28); // Dark Red Text
                        } else {
                            doc.setFillColor(245, 158, 11); // Orange
                            doc.setTextColor(180, 83, 9); // Dark Orange Text
                        }
                        
                        doc.rect(18, currentY - 4, pageWidth - 36, blockHeight, 'F');
                        doc.setGState(new doc.GState({ opacity: 1.0 }));
                        doc.setFont('helvetica', 'bold');

                        // Add small reference number
                        doc.setFontSize(7);
                        doc.text(`[${idx + 1}]`, 15, currentY - 1);
                        doc.setFontSize(10);
                    } else {
                        doc.setTextColor(51, 65, 85); // Slate-700
                        doc.setFont('helvetica', 'normal');
                    }

                    doc.text(splitText, 20, currentY);
                    currentY += blockHeight;
                });
            } else {
                doc.text("No sentence analysis available.", 20, currentY);
            }

            // 5. SOURCES TABLE (New Page)
            doc.addPage();
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('TOP MATCHED SOURCES', 20, 20);

            const tableData = (scanData.sources || []).map(s => [
                s.name,
                `${s.match}%`,
                s.link || 'Internal Database'
            ]);

            autoTable(doc, {
                startY: 30,
                head: [['Source', 'Similarity', 'URL / Reference']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [139, 92, 246] }, // Purple
                styles: { fontSize: 8 }
            });

            doc.save(`Analysis_Report_${scanData.filename.replace('.pdf', '')}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-heading mb-2">Analysis Report</h1>
                    <p className="text-body">{scanData.filename} • {scanData.words?.toLocaleString() || 0} words</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => handleExportPdf()}>
                    {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    {isExporting ? 'Generating...' : 'Export PDF'}
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
                            <div className="flex items-center justify-between w-full mb-6">
                                <h3 className="text-lg font-bold text-heading">AI Content Score</h3>
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold tracking-wider uppercase">DivEye Engine</span>
                            </div>

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
                            
                            {scanData.aiResult?.confidence && (
                                <div className="text-sm font-medium text-body">
                                    Confidence: <span className="text-accent">{scanData.aiResult.confidence}%</span>
                                </div>
                            )}
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

                    {scanData.aiResult?.indicators && scanData.aiResult.indicators.length > 0 && (
                        <GlassCard className="p-6 border-accent/10">
                            <h3 className="text-heading font-bold mb-4 flex items-center gap-2">
                                <Brain size={18} className="text-purple-400" /> Advanced Indicators
                            </h3>
                            <div className="space-y-4">
                                {scanData.aiResult.indicators.map((indicator, i) => (
                                    <div key={i} className="flex flex-col gap-1 border-b border-borderLight pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-heading">{indicator.name}</span>
                                            <span className="text-xs font-mono font-bold text-accent">{indicator.value}</span>
                                        </div>
                                        {indicator.note && (
                                            <p className="text-[11px] text-muted leading-tight">{indicator.note}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}
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
