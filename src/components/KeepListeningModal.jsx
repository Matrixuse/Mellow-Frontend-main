import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const KeepListeningModal = ({ isOpen, onClose }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style = 'hidden';
        }
        return () => {
            try { document.body.style.overflow = ''; } catch (e) { console.log(e) }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            // ref={containerRef}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center"
            onClick={onClose}
        >
            <div 
                className="relative w-full h-full max-w-6xl max-h-screen bg-gradient-to-br from-[#0f1720] to-[#1a2332] rounded-lg flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Keep Listening text in top left */}
                <div className="p-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white">Keep Listening</h1>
                </div>

                {/* Main content area */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <p className="text-gray-400 text-lg">More content coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default KeepListeningModal;
