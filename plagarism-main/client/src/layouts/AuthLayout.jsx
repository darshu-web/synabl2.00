import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldAlert, Quote } from 'lucide-react';

export const AuthLayout = () => {
    return (
        <div className="flex min-h-screen bg-primary transition-colors duration-300">
            {/* Left Pane - Illustration/Brand */}
            <div className="hidden lg:flex w-1/2 relative bg-secondary overflow-hidden flex-col justify-between p-12 border-r border-borderLight transition-colors duration-300">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/15 blur-[120px]" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2 group w-max">
                        <div className="bg-accent/10 p-2 rounded-xl group-hover:bg-accent/20 transition-colors">
                            <ShieldAlert className="text-accent" size={24} />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-heading">SYNABL</span>
                    </Link>

                    <div className="mt-24 max-w-md">
                        <h1 className="text-4xl font-bold text-heading leading-tight mb-6">
                            Protect your intellectual property with <span className="text-accent">Semantic Intelligence</span>.
                        </h1>
                        <p className="text-body text-lg leading-relaxed">
                            Our AI engine looks beyond exact word matches to find deeply paraphrased and syntax-altered copied content giving you a complete picture of document originality.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 glass-card p-6 mt-12 max-w-md border-l-4 border-l-accent rounded-l-none">
                    <Quote className="text-accent/50 rotate-180 mb-4" size={24} />
                    <p className="text-body font-medium italic mb-4 leading-relaxed">
                        "SYNABL uncovered plagiarism that TurnItIn completely missed. The semantic similarity detection is a game changer for our editorial process."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                            JS
                        </div>
                        <div>
                            <p className="text-heading text-sm font-semibold">Dr. Jane Smith</p>
                            <p className="text-muted text-xs">Head of Research, Tech University</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Pane - Form Outlet */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

                {/* Mobile Header */}
                <div className="absolute top-6 left-6 lg:hidden">
                    <Link to="/" className="flex items-center gap-2">
                        <ShieldAlert className="text-accent" size={24} />
                        <span className="text-xl font-bold tracking-tight text-heading">SYNABL</span>
                    </Link>
                </div>

                <div className="w-full max-w-md relative z-10">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};
