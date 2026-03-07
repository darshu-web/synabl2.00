import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CreditCard, CheckCircle, ShieldCheck, Download, ExternalLink } from 'lucide-react';
import { billingService } from '../../services/billingService';

export const Subscription = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);
        try {
            const result = await billingService.createCheckoutSession('pro_plan_1');
            if (result.success) {
                setIsSuccess(true);
            }
        } catch (err) {
            setError('Failed to initiate checkout. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManageBilling = async () => {
        try {
            const result = await billingService.manageSubscription();
            alert("Redirecting to Mock Stripe Customer Portal...");
        } catch (err) {
            console.error("Failed to load billing portal");
        }
    }

    const invoices = [
        { date: 'Oct 01, 2025', id: 'INV-2025-010', amount: '₹0.00', status: 'Paid (Free Plan)' },
    ];

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-heading mb-2">Subscription & Billing</h1>
                    <p className="text-body">Manage your subscription, payment methods, and billing history.</p>
                </div>
                {isSuccess && (
                    <Button variant="outline" onClick={handleManageBilling} className="gap-2">
                        <ExternalLink size={16} /> Manage Billing
                    </Button>
                )}
            </div>

            {!isSuccess ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Plan Details */}
                    <div className="space-y-6">
                        <GlassCard className="border-accent/15">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-heading">Upgrade to Pro</h3>
                                <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-bold border border-accent/15">POPULAR</span>
                            </div>

                            <div className="text-4xl font-black mb-2 text-heading">₹299 <span className="text-lg text-body font-medium">/ month</span></div>
                            <p className="text-sm text-body mb-8 pb-6 border-b border-borderLight">Billed monthly. Cancel anytime.</p>

                            <ul className="space-y-4 mb-6">
                                <li className="flex items-start gap-3 text-sm text-body">
                                    <CheckCircle className="text-accent shrink-0 mt-0.5" size={18} />
                                    <span><strong className="text-heading">Unlimited</strong> document checks (fair use policy)</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-body">
                                    <CheckCircle className="text-accent shrink-0 mt-0.5" size={18} />
                                    <span>Advanced Semantic & Syntactic Engine</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-body">
                                    <CheckCircle className="text-accent shrink-0 mt-0.5" size={18} />
                                    <span>AI-Generated Text Classifier Module</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-body">
                                    <CheckCircle className="text-accent shrink-0 mt-0.5" size={18} />
                                    <span>White-label PDF report downloading</span>
                                </li>
                            </ul>
                        </GlassCard>

                        <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border border-borderLight rounded-xl text-sm text-body">
                            <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                            <p>Secure 256-bit AES encryption. Payments processed by Stripe/Razorpay.</p>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <GlassCard className="p-8">
                        <h3 className="text-lg font-bold text-heading mb-6 flex items-center gap-2">
                            <CreditCard className="text-accent" /> Payment Details
                        </h3>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubscribe} className="space-y-5">
                            <Input
                                label="Cardholder Name"
                                placeholder="John Doe"
                                required
                            />

                            <div>
                                <label className="text-sm font-medium text-body ml-1 mb-1.5 block">Card Information</label>
                                <div className="bg-secondary border border-borderLight rounded-xl p-4 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <CreditCard size={18} className="text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Card number"
                                            className="bg-transparent focus:outline-none text-heading w-full text-sm font-mono tracking-widest placeholder-muted"
                                            maxLength="19"
                                            required
                                        />
                                    </div>
                                    <div className="h-px bg-borderLight w-full" />
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="text"
                                            placeholder="MM / YY"
                                            className="bg-transparent focus:outline-none text-heading w-20 text-sm font-mono placeholder-muted border-r border-borderLight pr-4"
                                            maxLength="5"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="CVC"
                                            className="bg-transparent focus:outline-none text-heading w-16 text-sm font-mono placeholder-muted"
                                            maxLength="4"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-borderLight flex items-center justify-between mb-4">
                                <span className="text-body">Total today</span>
                                <span className="text-xl font-bold text-heading">₹299.00</span>
                            </div>

                            <Button type="submit" size="lg" className="w-full" isLoading={isProcessing}>
                                {isProcessing ? 'Processing Payment...' : 'Subscribe Securely'}
                            </Button>
                        </form>
                    </GlassCard>
                </div>
            ) : (
                <GlassCard className="p-12 text-center border-emerald-500/20 relative overflow-hidden max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-emerald-500" size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-heading mb-4">You're All Set!</h2>
                    <p className="text-body text-lg mb-8">
                        Your Pro subscription is now active. You have been granted unlimited document checks and advanced features.
                    </p>
                    <Button variant="outline" className="px-8" onClick={() => window.location.href = '/dashboard'}>
                        Return to Dashboard
                    </Button>
                </GlassCard>
            )}

            {/* Billing History */}
            <GlassCard className="mt-8">
                <h3 className="text-lg font-bold text-heading mb-6">Billing History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-body">
                        <thead className="bg-secondary text-body font-semibold border-b border-borderLight">
                            <tr>
                                <th className="p-4 rounded-tl-xl">Date</th>
                                <th className="p-4">Invoice ID</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 rounded-tr-xl text-right">Receipt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv, i) => (
                                <tr key={i} className="border-b border-borderLight hover:bg-secondary/50 transition-colors">
                                    <td className="p-4">{inv.date}</td>
                                    <td className="p-4 font-mono text-xs">{inv.id}</td>
                                    <td className="p-4">{inv.amount}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-medium">{inv.status}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                            <Download size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};
