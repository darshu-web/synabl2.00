import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { X, CheckCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ExitIntentModal = () => {
    const [show, setShow] = useState(false);
    const [hasShown, setHasShown] = useState(false);

    useEffect(() => {
        const handleMouseLeave = (e) => {
            if (e.clientY <= 0 && !hasShown) {
                setShow(true);
                setHasShown(true);
            }
        };

        document.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [hasShown]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShow(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative z-10 w-full max-w-lg"
                    >
                        <GlassCard className="p-8 border-accent/30 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent via-emerald-400 to-accent" />

                            <button
                                onClick={() => setShow(false)}
                                className="absolute top-4 right-4 text-body hover:text-heading transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                                    <Zap className="text-accent" size={32} />
                                </div>

                                <h2 className="text-2xl font-bold text-heading mb-2">Wait! Don't leave your content unprotected.</h2>
                                <p className="text-body mb-8">
                                    Create a free account today and get <strong className="text-heading">3 full semantic plagiarism checks</strong> on us. No credit card required.
                                </p>

                                <div className="w-full space-y-3 mb-8 text-left max-w-xs mx-auto">
                                    <div className="flex items-center gap-3 text-sm text-body">
                                        <CheckCircle className="text-emerald-400" size={16} /> 100B+ Web Sources
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-body">
                                        <CheckCircle className="text-emerald-400" size={16} /> AI Text Detection
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-body">
                                        <CheckCircle className="text-emerald-400" size={16} /> Instant PDF Reports
                                    </div>
                                </div>

                                <Link to="/signup" className="w-full block" onClick={() => setShow(false)}>
                                    <Button size="lg" className="w-full text-lg shadow-lg shadow-accent/20">
                                        Claim My 3 Free Checks
                                    </Button>
                                </Link>
                                <button
                                    onClick={() => setShow(false)}
                                    className="mt-4 text-sm text-muted hover:text-body transition-colors"
                                >
                                    No thanks, I'll risk it
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
