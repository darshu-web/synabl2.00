import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPassword = () => {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center lg:text-left">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-body hover:text-heading mb-6 group transition-colors">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to login
                </Link>
                <h2 className="text-3xl font-bold text-heading mb-2">Reset Password</h2>
                <p className="text-body text-sm">Enter your email and we'll send you reset instructions</p>
            </div>

            <GlassCard className="p-8">
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email Address"
                            placeholder="you@corporate.com"
                            type="email"
                            icon={Mail}
                            required
                        />
                        <Button type="submit" className="w-full mt-4" size="lg">
                            Send Reset Link
                        </Button>
                    </form>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-emerald-500" size={32} />
                        </div>
                        <h3 className="text-heading text-xl font-bold mb-2">Check your email</h3>
                        <p className="text-body text-sm mb-6">We've sent password reset instructions to your email address.</p>
                        <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                            Try another email
                        </Button>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
