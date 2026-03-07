import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const Input = React.forwardRef(({ className, label, icon: Icon, error, ...props }, ref) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label className="text-sm font-medium text-body ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                        <Icon size={18} />
                    </div>
                )}
                <motion.input
                    whileFocus={{ scale: 1.01 }}
                    ref={ref}
                    className={cn(
                        'w-full bg-card border border-borderLight rounded-xl px-4 py-2.5 text-heading placeholder-muted',
                        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200',
                        Icon && 'pl-10',
                        error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-red-400 ml-1">{error}</span>
            )}
        </div>
    );
});

Input.displayName = 'Input';
