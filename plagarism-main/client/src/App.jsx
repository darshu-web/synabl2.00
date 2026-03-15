import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { Upload } from './pages/dashboard/Upload';
import { Report } from './pages/dashboard/Report';
import { Subscription } from './pages/dashboard/Subscription';
import { UserProvider, useUser } from './context/UserContext';
import { Settings } from './pages/dashboard/Settings';
import { Paraphraser } from './pages/dashboard/Paraphraser';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useUser();

    if (loading) {
        return (
            <div className="flex bg-primary h-screen w-screen items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Check if user is logged in and tries to access login/signup pages
const PublicAuthRoute = ({ children }) => {
    const { user, loading } = useUser();

    if (loading) return null; // Or a subtle loader

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    return (
        <UserProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Marketing Routes */}
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Home />} />
                    </Route>

                    {/* Authentication Routes */}
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
                        <Route path="/signup" element={<PublicAuthRoute><Signup /></PublicAuthRoute>} />
                        <Route path="/forgot-password" element={<PublicAuthRoute><ForgotPassword /></PublicAuthRoute>} />
                    </Route>

                    {/* Protected Dashboard Routes */}
                    <Route element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="/dashboard" element={<DashboardOverview />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/reports" element={<Report />} />
                        <Route path="/reports/latest" element={<Report />} />
                        <Route path="/subscription" element={<Subscription />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/paraphraser" element={<Paraphraser />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </UserProvider>
    );
}

export default App;
