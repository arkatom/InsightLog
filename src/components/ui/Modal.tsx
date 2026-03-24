import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden fade-in">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="hover:bg-primary-100 rounded p-1 transition-colors">
            <X size={24} className="text-primary-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">{children}</div>
      </div>
    </div>
  );
}
