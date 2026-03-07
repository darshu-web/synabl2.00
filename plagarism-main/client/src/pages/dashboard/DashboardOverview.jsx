import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { FileUp, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardOverview = () => {
    const stats = [
        { title: 'Total Documents Checked', value: '12', icon: FileUp, trend: '+3 this week' },
        { title: 'Average Similarity Score', value: '14.2%', icon: TrendingUp, trend: '-2.1% improvement' },
        { title: 'High Risk Detections', value: '1', icon: ShieldAlert, trend: 'Needs review' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-heading mb-2">Dashboard Overview</h1>
                <p className="text-body">Welcome back! Here's a summary of your recent activity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <GlassCard key={i} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-accent/10 rounded-xl text-accent border border-accent/10">
                                    <Icon size={24} />
                                </div>
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-body border border-borderLight">
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className="text-body text-sm font-medium mb-1">{stat.title}</h3>
                            <p className="text-3xl font-bold text-heading">{stat.value}</p>
                        </GlassCard>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard>
                        <h3 className="text-lg font-bold text-heading mb-4">Recent Reports</h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-borderLight hover:bg-secondary transition-colors duration-200">
                                    <div className="flex items-center gap-4">
                                        <FileUp size={20} className="text-muted" />
                                        <div>
                                            <p className="text-heading font-medium text-sm">Research_Paper_v{item}.pdf</p>
                                            <p className="text-xs text-muted">Scanned 2 hours ago</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs border border-emerald-500/15">8% Match</span>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                <div className="space-y-6">
                    <GlassCard className="border-accent/15">
                        <h3 className="text-lg font-bold text-heading mb-4">Current Plan</h3>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-3xl font-bold text-heading">Free Plan</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm text-body">
                                <CheckCircle size={16} className="text-emerald-500" /> 3 Document Checks
                            </li>
                            <li className="flex items-center gap-2 text-sm text-body">
                                <CheckCircle size={16} className="text-emerald-500" /> Basic Lexical Analysis
                            </li>
                            <li className="flex items-center gap-2 text-sm text-body">
                                <CheckCircle size={16} className="text-emerald-500" /> Web Match Database
                            </li>
                        </ul>
                        <Link to="/subscription">
                            <Button className="w-full">Upgrade to Pro</Button>
                        </Link>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
