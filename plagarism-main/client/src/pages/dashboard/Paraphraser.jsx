import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import { Sparkles, ArrowRight, Copy, Check, RotateCcw, AlertCircle, Loader2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const Paraphraser = () => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState('paraphrase');
    const [similarity, setSimilarity] = useState(null);
    const [diff, setDiff] = useState(null);

    const handleAction = async (selectedMode) => {
        if (!inputText.trim()) {
            toast.error("Please enter some text first.");
            return;
        }

        setIsProcessing(true);
        setMode(selectedMode);
        
        try {
            const token = localStorage.getItem('synabl_token');
            const endpoint = selectedMode === 'expand' ? '/api/tools/expand' : '/api/tools/paraphrase';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: inputText })
            });

            if (!response.ok) throw new Error("Processing failed");

            const data = await response.json();
            setOutputText(data.result);
            setSimilarity(data.similarity);
            setDiff(data.diff);
            toast.success(`${selectedMode === 'expand' ? 'Expansion' : 'Paraphrasing'} complete!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to process text. AI service may be starting up...");
        } finally {
            setIsProcessing(false);
        }
    };

    const renderTaggedText = (tags) => {
        if (!tags) return null;
        return tags.map((t, i) => (
            <span 
                key={i} 
                className={cn(
                    t.type === 'removed' ? "bg-red-500/20 text-red-500 line-through px-1 rounded mx-0.5" : 
                    t.type === 'added' ? "bg-emerald-500/20 text-emerald-500 px-1 rounded mx-0.5" : ""
                )}
            >
                {t.text}{' '}
            </span>
        ));
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-heading flex items-center gap-3">
                        <Sparkles className="text-accent" /> Magic Rewriter
                    </h1>
                    <p className="text-body mt-1">Professional paraphrasing and content expansion tools.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* Input Section */}
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-semibold text-muted uppercase tracking-wider">Source Content</span>
                        <span className="text-xs text-muted">{inputText.length} chars</span>
                    </div>
                    <GlassCard className="flex-1 p-0 overflow-hidden border-accent/10 focus-within:border-accent/30 transition-colors">
                        <textarea
                            className="w-full h-[300px] p-6 bg-transparent text-heading resize-none focus:outline-none custom-scrollbar leading-relaxed"
                            placeholder="Paste your text here..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </GlassCard>
                </div>

                {/* Result Section */}
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-semibold text-muted uppercase tracking-wider">Rewritten Result</span>
                        {similarity !== null && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted">Similarity:</span>
                                <span className={`text-xs font-bold ${similarity > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                    {similarity}%
                                </span>
                            </div>
                        )}
                    </div>
                    <GlassCard className={`flex-1 p-0 overflow-hidden relative ${isProcessing ? 'animate-pulse border-accent' : 'border-borderLight'}`}>
                        {isProcessing && (
                            <div className="absolute inset-0 z-10 bg-card/40 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 text-center p-6">
                                <Loader2 className="text-accent animate-spin" size={40} />
                                <p className="text-heading font-bold">Processing AI Logic...</p>
                            </div>
                        )}
                        <textarea
                            readOnly
                            className="w-full h-[300px] p-6 bg-transparent text-heading resize-none focus:outline-none custom-scrollbar leading-relaxed"
                            placeholder="Results will appear here..."
                            value={outputText}
                        />
                    </GlassCard>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-2 border-y border-borderLight">
                <Button 
                    variant="outline" 
                    className="gap-2 h-12 px-8 rounded-xl group"
                    onClick={() => handleAction('paraphrase')}
                    isLoading={isProcessing && mode === 'paraphrase'}
                    disabled={isProcessing}
                >
                    <RotateCcw size={18} /> Paraphrase
                </Button>
                <Button 
                    className="gap-2 h-12 px-8 rounded-xl"
                    onClick={() => handleAction('expand')}
                    isLoading={isProcessing && mode === 'expand'}
                    disabled={isProcessing}
                >
                    <Maximize2 size={18} /> Expand Content
                </Button>
            </div>

            {/* Visual Comparison Section */}
            {diff && !isProcessing && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-bold text-heading flex items-center gap-2">
                        <Check className="text-emerald-500" /> Visual Comparison
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2">
                                <RotateCcw size={12} /> Original Text (Deleted)
                            </p>
                            <GlassCard className="p-6 text-sm leading-relaxed overflow-y-auto max-h-[200px] bg-red-500/[0.02] border-red-500/10">
                                {renderTaggedText(diff.original_tagged)}
                            </GlassCard>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2">
                                <Sparkles size={12} /> Generated Text (Changes)
                            </p>
                            <GlassCard className="p-6 text-sm leading-relaxed overflow-y-auto max-h-[200px] bg-emerald-500/[0.02] border-emerald-500/10">
                                {renderTaggedText(diff.generated_tagged)}
                            </GlassCard>
                        </div>
                    </div>

                    {/* Change Analysis Board */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        {[
                            { label: "Original Words", value: diff.metrics.original_words, color: "text-heading" },
                            { label: "Generated Words", value: diff.metrics.generated_words, color: "text-heading" },
                            { label: "Unchanged", value: diff.metrics.unchanged, color: "text-emerald-400" },
                            { label: "Changed", value: diff.metrics.changed, color: "text-red-400" }
                        ].map((m, i) => (
                            <GlassCard key={i} className="p-4 text-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-tighter mb-1">{m.label}</p>
                                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Modification Rate & Substitutions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="md:col-span-2 p-6 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-heading">Modification Rate</span>
                                <span className="text-sm font-black text-accent">{diff.metrics.modification_rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-accent transition-all duration-1000" 
                                    style={{ width: `${diff.metrics.modification_rate}%` }} 
                                />
                            </div>
                            <p className="text-[10px] text-muted mt-3">
                                <span className="text-emerald-400 font-bold">Matched: {100 - diff.metrics.modification_rate}%</span> of the content was preserved from the original source.
                            </p>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h4 className="text-xs font-bold text-muted uppercase mb-4 tracking-wider">Word Substitutions</h4>
                            <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                                {diff.substitutions.length > 0 ? diff.substitutions.map((s, i) => (
                                    <div key={i} className="text-xs font-mono text-body py-1 flex items-center justify-between border-b border-borderLight last:border-0">
                                        {s}
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted">No direct word swaps detected.</p>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded" />
                            <span className="text-[10px] font-bold text-muted uppercase">Removed/Changed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded" />
                            <span className="text-[10px] font-bold text-muted uppercase">Added/New</span>
                        </div>
                    </div>
                </div>
            )}

            {!diff && (
                <GlassCard className="p-6 border-accent/5 bg-accent/5">
                    <div className="flex gap-4">
                        <AlertCircle className="text-accent shrink-0" />
                        <div>
                            <h4 className="text-heading font-semibold text-sm">Pro Tip</h4>
                            <p className="text-xs text-body leading-relaxed mt-1">
                                Paste your text above and click process to see a detailed **Visual Comparison** and **Change Analysis** 
                                dashboard, similar to professional academic tools.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};
