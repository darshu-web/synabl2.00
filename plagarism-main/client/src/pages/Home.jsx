import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { ShieldCheck, Brain, FileSearch, Code, Layers, FileText, CheckCircle, ArrowRight, ChevronDown, Award, Shield } from 'lucide-react';

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

export const Home = () => {
    const [openFAQ, setOpenFAQ] = useState(null);

    const features = [
        { icon: FileSearch, title: 'Lexical Detection', desc: 'Identifies exact word and sentence matches instantly across billions of sources.' },
        { icon: Layers, title: 'Syntactic Analysis', desc: 'Detects structural reordering and active/passive voice manipulations.' },
        { icon: Brain, title: 'Semantic Similarity', desc: 'Understand the underlying meaning to catch deeply paraphrased content.' },
        { icon: Code, title: 'AI-Generated Text', desc: 'Industry-leading classifiers predict content written by LLMs (GPT, Claude, etc).' },
    ];

    const steps = [
        { num: '01', title: 'Upload Document', desc: 'Drag and drop your PDF, DOCX, or TXT file into our secure vault.' },
        { num: '02', title: 'AI Analysis', desc: 'The document undergoes concurrent lexical, syntactic, and semantic scans.' },
        { num: '03', title: 'Similarity Matching', desc: 'We cross-reference against 100B+ web pages and academic databases.' },
        { num: '04', title: 'Detailed Report', desc: 'Download a verifiable, line-by-line origin report with precise highlighting.' },
    ];

    const faqs = [
        { q: 'Is my data secure?', a: 'Absolutely. We use AES-256 encryption. Documents are processed in volatile memory and never stored without your explicit consent.' },
        { q: 'How accurate is the detection?', a: 'SYNABL boasts a 99.2% accuracy rate for direct plagiarism and 97% for semantic rewrites, validated by independent academic testing.' },
        { q: 'Do you store my documents?', a: 'No. Unlike other providers, we do not add your confidential commercial or academic documents to our comparison database.' },
        { q: 'Can institutions use this?', a: 'Yes! We offer bulk API endpoint access and custom institutional billing via our Enterprise plan.' },
    ];

    return (
        <div className="w-full relative z-10 text-heading pb-20">
            {/* Hero Section */}
            <section className="pt-28 pb-20 px-6 container mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        SYNABL V2.0 Engine is Live
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        AI-Powered Plagiarism Detection with <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-emerald-400">Semantic Intelligence</span>
                    </h1>
                    <p className="text-xl text-body mb-12 max-w-2xl mx-auto leading-relaxed">
                        Go beyond simple word matching. Our enterprise-grade engine performs lexical, syntactic, and semantic detection to protect your intellectual property.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/signup">
                            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold flex items-center gap-2 group">
                                Try 3 Free Checks
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Button variant="secondary" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold">
                            View Sample Report
                        </Button>
                    </div>
                    <p className="text-sm text-muted mt-4">No Credit Card Required. Instant setup.</p>
                </motion.div>
            </section>

            {/* Trust Section */}
            <section className="py-10 border-y border-borderLight bg-secondary/50">
                <div className="container mx-auto px-6">
                    <p className="text-center text-sm font-semibold text-muted mb-8 uppercase tracking-widest">
                        Trusted by innovative research institutions & enterprises
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 hover:opacity-60 transition-all duration-500">
                        <div className="flex items-center gap-2 text-xl font-bold text-heading"><Award /> Stanford Mock</div>
                        <div className="flex items-center gap-2 text-xl font-bold text-heading"><Shield /> MIT Tech</div>
                        <div className="flex items-center gap-2 text-xl font-bold text-heading"><Award /> Oxford Research</div>
                        <div className="flex items-center gap-2 text-xl font-bold text-heading"><Shield /> TechNova Inc</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 container mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Multi-Dimensional Detection</h2>
                    <p className="text-body text-lg">We don't just compare text strings. We analyze the complete DNA of your document.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feat, i) => (
                        <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                            <GlassCard hoverEffect className="h-full">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6 border border-accent/15">
                                    <feat.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                                <p className="text-body text-sm leading-relaxed">{feat.desc}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How it Works Section */}
            <section id="how-it-works" className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/80 to-transparent pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How SYNABL Works</h2>
                        <p className="text-body text-lg">A seamless, enterprise-ready workflow from upload to definitive proof.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {steps.map((step, i) => (
                            <div key={i} className="relative">
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-accent/50 to-transparent" />
                                )}
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-card border-2 border-accent/30 flex items-center justify-center text-xl font-black text-accent mb-6 shadow-soft">
                                        {step.num}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                    <p className="text-body text-sm">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 container mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing</h2>
                    <p className="text-body text-lg">Start for free. Upgrade when your volume demands it.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {/* Free Plan */}
                    <GlassCard className="p-8">
                        <h3 className="text-2xl font-bold mb-2">Free Trial</h3>
                        <p className="text-body mb-6 font-medium">For occasional checks</p>
                        <div className="text-4xl font-black mb-8">₹0 <span className="text-lg text-muted font-medium">/ forever</span></div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> 3 Checks Total</li>
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> Basic Lexical Match</li>
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> View Online Report</li>
                        </ul>
                        <Link to="/signup">
                            <Button variant="secondary" className="w-full">Start Free Trial</Button>
                        </Link>
                    </GlassCard>

                    {/* Pro Plan */}
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-accent to-emerald-400 blur opacity-20" />
                        <GlassCard className="p-8 relative border-accent/30 scale-105 z-10">
                            <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-gradient-to-r from-accent to-blue-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                                MOST POPULAR
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-heading">Pro</h3>
                            <p className="text-accent mb-6 font-medium">For professionals & writers</p>
                            <div className="text-4xl font-black mb-8">₹299 <span className="text-lg text-muted font-medium">/ month</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-body"><CheckCircle className="text-accent shrink-0" size={20} /> Unlimited Checks</li>
                                <li className="flex items-center gap-3 text-body"><CheckCircle className="text-accent shrink-0" size={20} /> Semantic & Syntactic Engine</li>
                                <li className="flex items-center gap-3 text-body"><CheckCircle className="text-accent shrink-0" size={20} /> AI-Generated Text Detection</li>
                                <li className="flex items-center gap-3 text-body"><CheckCircle className="text-accent shrink-0" size={20} /> Downloadable PDF Reports</li>
                            </ul>
                            <Link to="/signup">
                                <Button className="w-full">Upgrade to Pro</Button>
                            </Link>
                        </GlassCard>
                    </div>

                    {/* Institutional Plan */}
                    <GlassCard className="p-8">
                        <h3 className="text-2xl font-bold mb-2">Institutional</h3>
                        <p className="text-body mb-6 font-medium">For universities & enterprise</p>
                        <div className="text-4xl font-black mb-8">Custom</div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> Custom Quotas & Billing</li>
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> Private Database Separation</li>
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> API Access</li>
                            <li className="flex items-center gap-3 text-body"><CheckCircle className="text-emerald-500 shrink-0" size={20} /> Developer Support</li>
                        </ul>
                        <Button variant="secondary" className="w-full">Contact Sales</Button>
                    </GlassCard>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <GlassCard key={i} className="p-0 overflow-hidden">
                            <button
                                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                            >
                                <span className="font-semibold text-lg text-heading">{faq.q}</span>
                                <ChevronDown className={cn("transition-transform duration-300", openFAQ === i ? "rotate-180 text-accent" : "text-muted")} />
                            </button>
                            <AnimatePresence>
                                {openFAQ === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 text-body leading-relaxed">
                                            {faq.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>
                    ))}
                </div>
            </section>
        </div>
    );
};
