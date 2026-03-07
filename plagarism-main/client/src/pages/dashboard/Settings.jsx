import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useUser } from '../../context/UserContext';
import { User, Lock, Bell, Shield, LogOut } from 'lucide-react';

export const Settings = () => {
    const { user, logout } = useUser();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
        }, 1000);
    };

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    if (!user) return null;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-heading mb-2">Account Settings</h1>
                    <p className="text-body">Manage your profile, security preferences, and account configuration.</p>
                </div>
                <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 gap-2 hidden sm:inline-flex" onClick={logout}>
                    <LogOut size={16} /> Sign Out
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 shrink-0">
                    <GlassCard className="p-3">
                        <nav className="flex flex-col gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-accent/10 text-accent'
                                            : 'text-body hover:bg-secondary hover:text-heading'
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-accent' : 'text-muted'} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </GlassCard>

                    <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/15 text-sm xl:hidden">
                        <Shield className="text-accent shrink-0 mt-0.5" size={20} />
                        <p className="text-body">Your account data is secured with enterprise-grade encryption.</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <GlassCard className="p-8">
                                <h3 className="text-xl font-bold text-heading mb-6 border-b border-borderLight pb-4">Personal Information</h3>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-accent/20">
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <Button variant="outline" size="sm" className="mb-2">Change Avatar</Button>
                                        <p className="text-xs text-muted">JPG, GIF or PNG. Max size of 2MB.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input
                                            label="Full Name"
                                            defaultValue={user.name}
                                            icon={User}
                                        />
                                        <Input
                                            label="Email Address"
                                            defaultValue={user.email}
                                            type="email"
                                            icon={User}
                                            disabled
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input
                                            label="Organization / University"
                                            placeholder="e.g. Stanford University"
                                        />
                                        <Input
                                            label="Role / Title"
                                            placeholder="e.g. Professor of Computer Science"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-borderLight flex justify-end">
                                        <Button type="submit" isLoading={isSaving}>
                                            {isSaving ? 'Saving Changes...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>
                            </GlassCard>

                            {/* Danger Zone */}
                            <GlassCard className="p-8 border-red-500/20">
                                <h3 className="text-lg font-bold text-heading mb-2">Danger Zone</h3>
                                <p className="text-sm text-body mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                                <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                                    Delete Account
                                </Button>
                            </GlassCard>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <GlassCard className="p-8">
                                <h3 className="text-xl font-bold text-heading mb-6 border-b border-borderLight pb-4">Change Password</h3>

                                <form onSubmit={handleSave} className="space-y-5">
                                    <Input
                                        label="Current Password"
                                        type="password"
                                        placeholder="••••••••"
                                        icon={Lock}
                                    />
                                    <div className="h-4" />
                                    <Input
                                        label="New Password"
                                        type="password"
                                        placeholder="••••••••"
                                        icon={Lock}
                                    />
                                    <Input
                                        label="Confirm New Password"
                                        type="password"
                                        placeholder="••••••••"
                                        icon={Lock}
                                    />

                                    <div className="pt-4 flex justify-end">
                                        <Button type="submit" isLoading={isSaving}>
                                            {isSaving ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </div>
                                </form>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-heading">Two-Factor Authentication</h3>
                                    <span className="px-3 py-1 bg-secondary text-muted rounded-full text-xs font-bold border border-borderLight">Disabled</span>
                                </div>
                                <p className="text-sm text-body mb-6 max-w-lg">
                                    Add an extra layer of security to your account by enabling two-factor authentication via an authenticator app.
                                </p>
                                <Button variant="outline">Set up 2FA</Button>
                            </GlassCard>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <GlassCard className="p-8">
                                <h3 className="text-xl font-bold text-heading mb-6 border-b border-borderLight pb-4">Email Preferences</h3>

                                <div className="space-y-6">
                                    {[
                                        { title: 'Scan Completions', desc: 'Receive an email when a large document finishes processing.', active: true },
                                        { title: 'Weekly Digest', desc: 'A summary of your API usage and team activity.', active: false },
                                        { title: 'Security Alerts', desc: 'Notifications about new logins or suspicious activity.', active: true, disabled: true },
                                        { title: 'Product Updates', desc: 'News about new SYNABL features and model upgrades.', active: true },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start justify-between">
                                            <div>
                                                <h4 className={`font-semibold ${item.disabled ? 'text-muted' : 'text-heading'}`}>{item.title}</h4>
                                                <p className="text-sm text-muted mt-1">{item.desc}</p>
                                            </div>

                                            <div className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${item.active ? 'bg-accent' : 'bg-borderLight'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${item.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
