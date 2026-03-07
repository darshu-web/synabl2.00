import React, { useState, useRef } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { UploadCloud, File, AlertCircle, Lock, Loader2, Brain, Layers } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scanService } from '../../services/scanService';

export const Upload = () => {
    const { trialsRemaining, incrementTrial } = useUser();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (trialsRemaining > 0 && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const startAnalysis = async () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);
        setProgress(0);

        try {
            const result = await scanService.uploadDocument(file, (p) => {
                setProgress(p);
            });
            incrementTrial();
            navigate(`/reports?id=${result.id}`);
        } catch (err) {
            setError(err.message || 'Failed to upload document');
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-heading mb-2">Upload Document</h1>
                <p className="text-body">Upload a PDF, DOCX, or TXT file to begin semantic analysis.</p>
            </div>

            {trialsRemaining <= 0 ? (
                <GlassCard className="p-12 text-center border-red-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-red-400" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-heading mb-4">Trial Limit Reached</h2>
                    <p className="text-body max-w-md mx-auto mb-8 text-lg">
                        You have used all 3 of your free trial document checks. To continue scanning and protecting your content, please upgrade to a Pro plan.
                    </p>
                    <Link to="/subscription">
                        <Button size="lg" className="px-8 shadow-xl shadow-accent/20">
                            Upgrade to Pro
                        </Button>
                    </Link>
                </GlassCard>
            ) : (
                <GlassCard className={`border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-accent bg-accent/5' : 'border-borderLight'}`}>
                    <div
                        className="p-16 flex flex-col items-center justify-center text-center cursor-pointer"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileChange}
                        />

                        {!file ? (
                            <>
                                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6">
                                    <UploadCloud size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-heading mb-2">Drag & Drop your document here</h3>
                                <p className="text-body mb-6">Supported formats: PDF, DOCX, TXT (Max 50MB)</p>
                                <div className="flex items-center gap-4 text-sm text-muted">
                                    <div className="h-px bg-borderLight w-16" />
                                    <span>OR</span>
                                    <div className="h-px bg-borderLight w-16" />
                                </div>
                                <Button variant="secondary" className="mt-6 pointer-events-none">Browse Files</Button>
                            </>
                        ) : (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center w-full max-w-md">
                                <div className="w-20 h-20 bg-emerald-500/15 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20">
                                    <File size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-heading mb-1 truncate w-full">{file.name}</h3>
                                <p className="text-body text-sm mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                {error && (
                                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm w-full">
                                        {error}
                                    </div>
                                )}

                                {isUploading ? (
                                    <div className="w-full space-y-4">
                                        <div className="flex justify-between text-sm text-body">
                                            <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Analyzing semantic structure...</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                                        <Button variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                            Clear File
                                        </Button>
                                        <Button variant="secondary" className="flex-1 gap-2" onClick={(e) => { e.stopPropagation(); startAnalysis(); }}>
                                            <Brain size={18} />
                                            Detect AI Score
                                        </Button>
                                        <Button className="flex-[2] gap-2 shadow-lg shadow-accent/20" onClick={(e) => { e.stopPropagation(); startAnalysis(); }}>
                                            <Layers size={18} />
                                            Deep Plagiarism Check
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </GlassCard>
            )}

            {trialsRemaining > 0 && !isUploading && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 border border-borderLight text-sm text-body">
                    <AlertCircle size={20} className="text-accent shrink-0 mt-0.5" />
                    <p>
                        Your document will be checked against our proprietary semantic engine and over 100 billion web sources.
                        This action will consume <strong className="text-heading">1</strong> of your remaining <strong className="text-heading">{trialsRemaining}</strong> free checks.
                    </p>
                </div>
            )}
        </div>
    );
};
