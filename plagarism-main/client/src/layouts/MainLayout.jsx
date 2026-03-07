import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity, Sun, Moon, Menu, X } from 'lucide-react';
import { ExitIntentModal } from '../components/ui/ExitIntentModal';
import { useTheme } from '../context/ThemeContext';

export const MainLayout = () => {
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col pt-20 relative overflow-hidden bg-primary transition-colors duration-300">
            <ExitIntentModal />
            {/* Background gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-borderLight bg-card/80 backdrop-blur-xl h-16 flex items-center transition-colors duration-300">
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="bg-accent/10 p-2 rounded-xl group-hover:bg-accent/20 transition-colors">
                            <Activity className="text-accent" size={22} />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-heading">SYNABL</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-body">
                        <a href="#features" className="hover:text-heading transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-heading transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-heading transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative w-9 h-9 rounded-xl bg-secondary border border-borderLight flex items-center justify-center text-body hover:text-heading hover:bg-card transition-all duration-200"
                            aria-label="Toggle theme"
                        >
                            <Sun size={16} className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
                            <Moon size={16} className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
                        </button>

                        <Link to="/login" className="text-sm font-medium text-body hover:text-heading transition-colors hidden sm:block">
                            Log in
                        </Link>
                        <Link to="/signup" className="bg-accent hover:bg-accentHover text-white px-5 py-2 rounded-xl text-sm font-medium shadow-lg shadow-accent/20 transition-all duration-200 hover:scale-105 active:scale-95 hidden sm:block">
                            Try 3 Free Checks
                        </Link>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden w-9 h-9 rounded-xl bg-secondary border border-borderLight flex items-center justify-center text-body"
                        >
                            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-card border-b border-borderLight p-6 md:hidden shadow-lg">
                        <div className="flex flex-col gap-4">
                            <a href="#features" className="text-body hover:text-heading transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
                            <a href="#how-it-works" className="text-body hover:text-heading transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
                            <a href="#pricing" className="text-body hover:text-heading transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                            <hr className="border-borderLight" />
                            <Link to="/login" className="text-body hover:text-heading transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                            <Link to="/signup" className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-medium text-center shadow-lg shadow-accent/20" onClick={() => setMobileMenuOpen(false)}>
                                Try 3 Free Checks
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="flex-grow z-10 w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-borderLight bg-secondary py-12 mt-20 relative z-10 transition-colors duration-300">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="text-accent" size={20} />
                            <span className="text-lg font-bold text-heading">SYNABL</span>
                        </div>
                        <p className="text-body text-sm max-w-sm leading-relaxed">
                            Intelligent plagiarism sensing with advanced lexical, syntactic, and semantic AI detection specifically built for commercial and enterprise standards.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-heading font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
                        <ul className="space-y-2.5 text-sm text-body">
                            <li><a href="#pricing" className="hover:text-accent transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">API Features</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Enterprise</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-heading font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
                        <ul className="space-y-2.5 text-sm text-body">
                            <li><a href="#" className="hover:text-accent transition-colors">About</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Contact</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto px-6 mt-12 pt-8 border-t border-borderLight text-center text-muted text-sm">
                    &copy; {new Date().getFullYear()} SYNABL AI. All rights reserved.
                </div>
            </footer>
        </div>
    );
};
