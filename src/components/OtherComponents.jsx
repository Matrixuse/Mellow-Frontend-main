import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Instagram, Twitter, Facebook } from 'lucide-react';

// Helper function to format time from seconds to MM:SS
const formatTime = (time) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Loader Component
export const Loader = () => (
    <div className="flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
    </div>
);

// Header Component
export const Header = ({ onLogout }) => (
    <div className="flex justify-end p-4">
        <button onClick={onLogout} className="text-gray-400 hover:text-white">Logout</button>
    </div>
);


// Controls Component
const ControlsInner = ({ isPlaying, onPlayPause, onNext, onPrev, isShuffle, onShuffleToggle, isRepeat, onRepeatToggle }) => (
    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-nowrap">
            <button onClick={onShuffleToggle} className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${isShuffle ? 'text-blue-400' : 'text-gray-400'}`} aria-label="Shuffle">
                <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button onClick={onPrev} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-300" aria-label="Previous Song">
                <SkipBack className="w-5 h-6 sm:w-7 sm:h-7" />
            </button>
            <button onClick={onPlayPause} className="bg-blue-600 text-white rounded-full p-4 sm:p-5 hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5" /> : <Play className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5" />}
            </button>
            <button onClick={onNext} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-300" aria-label="Next Song">
                <SkipForward className="w-5 h-6 sm:w-7 sm:h-7" />
            </button>
            <button onClick={onRepeatToggle} className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${isRepeat ? 'text-blue-400' : 'text-gray-400'}`} aria-label="Repeat">
                <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
    </div>
);

// Memoize controls so parent re-renders (e.g. progress changes) won't cause the buttons to re-render
export const Controls = React.memo(ControlsInner);
Controls.displayName = 'Controls';

// ProgressBar Component (YEH UPDATED VERSION HAI)
export const ProgressBar = ({ progress, onProgressChange, duration, currentTime }) => (
    <div className="w-full space-y-1">
        <input
            type="range"
            min="0"
            max="100"
            value={progress || 0}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            style={{ background: `linear-gradient(to right, #ffffff ${progress}%, #4B5563 ${progress}%)` }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer range-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
        <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
        </div>
    </div>
);

// VolumeControl Component (YEH UPDATED VERSION HAI)
const VolumeControlInner = ({ volume, onVolumeChange }) => (
    <div className="flex items-center gap-2">
        <button onClick={() => onVolumeChange(volume > 0 ? 0 : 0.5)} className="text-gray-400 hover:text-white">
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ background: `linear-gradient(to right, #ffffff ${volume * 100}%, #4B5563 ${volume * 100}%)` }}
            className="w-full h-1 rounded-full appearance-none cursor-pointer range-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
    </div>
);

// Memoize volume so UI re-renders (progress updates) don't re-create the volume control UI unless props change
export const VolumeControl = React.memo(VolumeControlInner);
VolumeControl.displayName = 'VolumeControl';

// Footer Component
export const Footer = ({ onDeveloperClick }) => (
    <footer className="w-full pt-12 pb-4 text-gray-400 text-sm mt-8">
        <div className="border-t border-gray-700 mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Company</h3>
                <button className="block text-left hover:text-white">About</button>
                <button className="block text-left hover:text-white">Jobs</button>
                <button className="block text-left hover:text-white">For the Record</button>
            </div>
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Communities</h3>
                <button className="block text-left hover:text-white">For Artists</button>
                <button onClick={onDeveloperClick} className="block text-left hover:text-white">Developers</button>
                <button className="block text-left hover:text-white">Investors</button>
                <button className="block text-left hover:text-white">Vendors</button>
            </div>
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Useful links</h3>
                <button className="block text-left hover:text-white">Support</button>
                <button className="block text-left hover:text-white"><a href="/feedback">Feedback</a></button>
                <button className="block text-left hover:text-white">Free Mobile App</button>
            </div>
            <div className="space-y-3 col-span-2 md:col-span-1">
                <h3 className="font-bold text-white mb-4">Mellow Plans</h3>
                <button className="block text-left hover:text-white">Mellow Individual</button>
                <button className="block text-left hover:text-white">Mellow Family</button>
                <button className="block text-left hover:text-white">Mellow Student</button>
                <button className="block text-left hover:text-white">Mellow Free</button>
            </div>
             <div className="col-span-2 md:col-span-1 flex md:justify-end items-start gap-4">
                <a href="/" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Instagram size={20} className="text-white" /></a>
                <a href="/" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Twitter size={20} className="text-white" /></a>
                <a href="/" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Facebook size={20} className="text-white" /></a>
            </div>
        </div>
        <div className="border-t border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-3 gap-y-4 items-start text-xs">
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button className="hover:text-white">Legal</button>
                <button className="hover:text-white">Safety & Privacy Center</button>
                <button className="hover:text-white">Privacy Policy</button>
                <button className="hover:text-white">Cookies</button>
                <button className="hover:text-white">Accessibility</button>
            </div>
            <div className="flex flex-col items-center mt-6 md:mt-4">
                <span>© 2025 Mellow</span>
                <span>Created by Naman</span>
            </div>
            <div></div>
        </div>
    </footer>
);

