import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { FileUp, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { scanService } from '../../services/scanService';

export const DashboardOverview = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await scanService.getScanHistory();
                setHistory(data);
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    const avgSimilarity = history.length > 0 
        ? (history.reduce((acc, scan) => acc + (scan.similarity || 0), 0) / history.length).toFixed(1)
        : '0.0';

    const highRiskCount = history.filter(scan => (scan.similarity || 0) > 30).length;

    const stats = [
        { title: 'Total Documents Checked', value: history.length.toString(), icon: FileUp, trend: 'Lifetime' },
        { title: 'Average Similarity Score', value: `${avgSimilarity}%`, icon: TrendingUp, trend: 'Aggregated' },
        { title: 'High Risk Detections', value: highRiskCount.toString(), icon: ShieldAlert, trend: history.length > 0 ? 'Action needed' : 'None' },
    ];

    if (!user) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-heading mb-2">Dashboard Overview</h1>
                <p className="text-body">Welcome back, {user.name}! Here's a summary of your recent activity.</p>
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
                            {loading ? (
                                <div className="text-center py-8 text-muted">Loading history...</div>
                            ) : history.length > 0 ? (
                                history.slice(0, 5).map((scan) => (
                                    <div key={scan.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-borderLight hover:bg-secondary transition-colors duration-200">
                                        <div className="flex items-center gap-4">
                                            <FileUp size={20} className="text-muted" />
                                            <div>
                                                <p className="text-heading font-medium text-sm">{scan.filename}</p>
                                                <p className="text-xs text-muted">{new Date(scan.date).toLocaleDateString()} • {scan.words} words</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold bg-opacity-10 px-2.5 py-1 rounded-lg text-xs border ${
                                                scan.similarity > 30 ? 'text-red-500 bg-red-500 border-red-500/15' : 'text-emerald-500 bg-emerald-500 border-emerald-500/15'
                                            }`}>
                                                {scan.similarity}% Match
                                            </span>
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/reports?id=${scan.id}`)}>View</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-borderLight rounded-2xl">
                                    <p className="text-muted mb-4">No scans found yet</p>
                                    <Link to="/upload">
                                        <Button variant="outline" size="sm">Start First Scan</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                <div className="space-y-6">
                    <GlassCard className="border-accent/15">
                        <h3 className="text-lg font-bold text-heading mb-4">Current Plan</h3>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-3xl font-bold text-heading">{user.plan || 'Free Plan'}</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm text-body">
                                <CheckCircle size={16} className="text-emerald-500" /> {user.trialLimit - user.trialsUsed} Checks Remaining
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
