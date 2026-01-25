import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-primary-700 mb-1">{label}</label>}
      <input
        className={`w-full px-4 py-3 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 focus:bg-white transition-all ${className}`}
        {...props}
      />
    </div>
  );
}
