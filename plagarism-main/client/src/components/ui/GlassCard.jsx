import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const GlassCard = React.forwardRef(({ className, children, hoverEffect = false, ...props }, ref) => {
    return (
        <motion.div
            ref={ref}
            whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2 } } : {}}
            className={cn(
                'glass-card p-6 overflow-hidden relative transition-all duration-300',
                className
            )}
            {...props}
        >
            {/* Subtle top glare effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-borderLight to-transparent" />
            {children}
        </motion.div>
    );
});

GlassCard.displayName = 'GlassCard';
