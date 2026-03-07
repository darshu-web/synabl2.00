import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export const Login = () => {
    const navigate = useNavigate();
    const { login } = useUser();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-heading mb-2">Welcome Back</h2>
                <p className="text-body text-sm">Sign in to your SYNABL account</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                    <Input
                        label="Email Address"
                        placeholder="you@corporate.com"
                        type="email"
                        icon={Mail}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <div className="space-y-2">
                        <Input
                            label="Password"
                            placeholder="••••••••"
                            type="password"
                            icon={Lock}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Link to="/forgot-password" className="text-xs text-accent hover:text-accentHover transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <Button type="submit" className="w-full mt-4" size="lg" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-body">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-accent hover:text-accentHover font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            </GlassCard>
        </div>
    );
};
