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
        await delay(800); // Simulate API latency
        const user = mockUsers.find(u => u.email === email && u.password === password);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Create a JWT-like mock token
        const token = btoa(JSON.stringify({ id: user.id, email: user.email, exp: Date.now() + 86400000 }));

        // Return safe user data (exclude password)
        const { password: _, ...safeUser } = user;

        return { token, user: safeUser };
    },

    async register(name, email, password) {
        await delay(1000); // Simulate creating account

        if (mockUsers.some(u => u.email === email)) {
            throw new Error('Email is already registered');
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password,
            plan: 'Free Plan',
            trialLimit: 3,
            trialsUsed: 0,
            documentsChecked: 0,
            avgSimilarity: 0,
        };

        mockUsers.push(newUser);

        const token = btoa(JSON.stringify({ id: newUser.id, email: newUser.email, exp: Date.now() + 86400000 }));
        const { password: _, ...safeUser } = newUser;

        return { token, user: safeUser };
    },

    async getCurrentUser(token) {
        await delay(500);
        if (!token) throw new Error('No token provided');

        try {
            const decoded = JSON.parse(atob(token));
            if (decoded.exp < Date.now()) throw new Error('Token expired');

            const user = mockUsers.find(u => u.id === decoded.id);
            if (!user) throw new Error('User not found');

            const { password: _, ...safeUser } = user;
            return safeUser;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
};
