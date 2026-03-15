// Simulate network delay
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user database
let mockUsers = [
    {
        id: '1',
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123', // In a real app, this would be hashed
        plan: 'Free Plan',
        trialLimit: 3,
        trialsUsed: 0,
        documentsChecked: 12,
        avgSimilarity: 14.2,
    }
];

export const authService = {
    async login(email, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to login');
        }

        return await response.json();
    },

    async register(name, email, password) {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to register');
        }

        return await response.json();
    },

    async getCurrentUser(token) {
        if (!token) throw new Error('No token provided');

        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        return await response.json();
    }
};
