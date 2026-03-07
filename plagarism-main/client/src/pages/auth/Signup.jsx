import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export const Signup = () => {
    const navigate = useNavigate();
    const { register } = useUser();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register(name, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-heading mb-2">Create an Account</h2>
                <p className="text-body text-sm">Start your 3 free checks today</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSignup} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                    <Input
                        label="Full Name"
                        placeholder="Dr. Jane Smith"
                        type="text"
                        icon={User}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        label="Email Address"
                        placeholder="you@corporate.com"
                        type="email"
                        icon={Mail}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Password"
                        placeholder="••••••••"
                        type="password"
                        icon={Lock}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <Button type="submit" className="w-full mt-4" size="lg" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-body">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:text-accentHover font-medium transition-colors">
                        Log in
                    </Link>
                </p>
            </GlassCard>
        </div>
    );
};
