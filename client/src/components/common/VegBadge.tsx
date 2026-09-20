import React from 'react';

interface VegBadgeProps {
  isVeg: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const VegBadge: React.FC<VegBadgeProps> = ({ isVeg, className = '', size = 'md' }) => {
  const dim = size === 'sm' ? 'w-3 h-3 p-[1.5px]' : 'w-3.5 h-3.5 p-[2px]';
  const dotDim = size === 'sm' ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5';

  if (isVeg) {
    return (
      <span
        title="Vegetarian"
        className={`inline-flex items-center justify-center border border-emerald-700/80 rounded-[3px] ${dim} bg-white/90 shadow-2xs flex-shrink-0 ${className}`}
      >
        <span className={`rounded-full bg-emerald-700 ${dotDim}`} />
      </span>
    );
  }

  return (
    <span
      title="Non-Vegetarian"
      className={`inline-flex items-center justify-center border border-rose-800/80 rounded-[3px] ${dim} bg-white/90 shadow-2xs flex-shrink-0 ${className}`}
    >
      <span className={`rounded-full bg-rose-800 ${dotDim}`} />
    </span>
  );
};
