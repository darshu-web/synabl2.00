/** @type {import('tailwindcss').Config} */

function withOpacity(varName) {
    return ({ opacityValue }) => {
        if (opacityValue !== undefined) {
            return `rgba(var(${varName}), ${opacityValue})`;
        }
        return `rgb(var(${varName}))`;
    };
}

export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./client/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: withOpacity('--color-bg'),
                card: withOpacity('--color-card'),
                secondary: withOpacity('--color-secondary'),
                accent: withOpacity('--color-accent'),
                accentHover: withOpacity('--color-accent-hover'),
                heading: withOpacity('--color-heading'),
                body: withOpacity('--color-body'),
                muted: withOpacity('--color-muted'),
                borderLight: withOpacity('--color-border'),
                highlight: withOpacity('--color-highlight'),
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                info: '#3B82F6',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
            },
        },
    },
    plugins: [],
}
