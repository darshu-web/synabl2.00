import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileUp, FileText, CreditCard, Settings, LogOut, ShieldAlert, Sun, Moon, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export const DashboardLayout = () => {
    const location = useLocation();
    const { user, trialsRemaining, logout } = useUser();
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const TRIAL_LIMIT = user.trialLimit;

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Upload Document', icon: FileUp, path: '/upload' },
        { label: 'Reports', icon: FileText, path: '/reports' },
        { label: 'Subscription', icon: CreditCard, path: '/subscription' },
        { label: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-primary overflow-hidden transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-borderLight bg-card flex flex-col transition-all duration-300",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-borderLight">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="bg-accent/10 p-2 border border-accent/20 rounded-xl group-hover:bg-accent/20 transition-colors">
                            <ShieldAlert className="text-accent" size={18} />
                        </div>
                        <span className="font-bold text-heading tracking-wide">SYNABL<span className="text-accent">OS</span></span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-body hover:text-heading transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm group",
                                    isActive
                                        ? "bg-accent/10 text-accent border border-accent/15"
                                        : "text-body hover:bg-secondary hover:text-heading"
                                )}
                            >
                                <Icon size={18} className={cn(isActive ? "text-accent" : "text-muted group-hover:text-body")} />
                                {item.label}
                            </Link>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-borderLight">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-secondary cursor-pointer transition-all duration-200 text-sm text-body group w-full"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-emerald-400 flex items-center justify-center text-white font-bold text-xs">
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 overflow-hidden text-left">
                            <p className="text-heading font-medium truncate text-sm">{user.name}</p>
                            <p className="text-xs text-muted truncate">{user.plan}</p>
                        </div>
                        <LogOut size={16} className="text-muted group-hover:text-red-400 transition-colors" />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Navbar */}
                <header className="h-16 border-b border-borderLight bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-8 z-10 sticky top-0 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden w-9 h-9 rounded-xl bg-secondary border border-borderLight flex items-center justify-center text-body"
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative w-9 h-9 rounded-xl bg-secondary border border-borderLight flex items-center justify-center text-body hover:text-heading hover:bg-card transition-all duration-200"
                            aria-label="Toggle theme"
                        >
                            <Sun size={16} className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
                            <Moon size={16} className={`absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-muted font-medium">Free Trials</span>
                                <span className={cn(
                                    "text-sm font-bold",
                                    trialsRemaining > 0 ? "text-emerald-500" : "text-red-500"
                                )}>
                                    {trialsRemaining} of {TRIAL_LIMIT} remaining
                                </span>
                            </div>
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 rounded-full",
                                        trialsRemaining > 0 ? "bg-emerald-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${(trialsRemaining / TRIAL_LIMIT) * 100}%` }}
                                />
                            </div>
                        </div>
                        {trialsRemaining <= 1 && (
                            <Link to="/subscription" className="bg-accent hover:bg-accentHover text-white font-medium text-sm px-4 py-2 rounded-xl shadow-lg shadow-accent/20 transition-all duration-200 hover:scale-105 active:scale-95 hidden sm:block">
                                Upgrade Plan
                            </Link>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar">
                    <div className="absolute top-0 right-0 w-[60%] h-[60%] rounded-full bg-accent/3 blur-[150px] pointer-events-none" />
                    <div className="p-6 lg:p-8 pb-20 max-w-7xl mx-auto w-full relative z-10">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
