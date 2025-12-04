import React, { useState } from 'react';
import { ArrowLeft, User, Settings, LogOut, Music, List, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProfilePage = ({ user, onLogout, onShowQueue, onAdminClick }) => {
    const [isLogoutVisible, setIsLogoutVisible] = useState(false);

    return (
        <div className="flex-grow p-4 flex flex-col min-h-0 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <Link to="/" className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold">Profile</h1>
            </div>

            {/* User Info */}
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <User size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
                        <p className="text-gray-400">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="space-y-3">
                <Link 
                    to="/" 
                    className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <Home size={24} className="text-gray-400" />
                    <span className="text-white font-medium">Library</span>
                </Link>

                <Link 
                    to="/playlists" 
                    className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <Music size={24} className="text-gray-400" />
                    <span className="text-white font-medium">My Playlists</span>
                </Link>

                <button 
                    onClick={onShowQueue}
                    className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors w-full text-left"
                >
                    <List size={24} className="text-gray-400" />
                    <span className="text-white font-medium">Queue</span>
                </button>

                <button 
                    onClick={onAdminClick}
                    className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors w-full text-left"
                >
                    <Settings size={24} className="text-gray-400" />
                    <span className="text-white font-medium">Admin Panel</span>
                </button>

                <button 
                    onClick={() => setIsLogoutVisible(!isLogoutVisible)}
                    className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors w-full text-left"
                >
                    <LogOut size={24} className="text-red-400" />
                    <span className="text-red-400 font-medium">Logout</span>
                </button>

                {isLogoutVisible && (
                    <div className="ml-16 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                        <p className="text-red-400 text-sm mb-2">Are you sure you want to logout?</p>
                        <button 
                            onClick={onLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                            Yes, Logout
                        </button>
                    </div>
                )}
            </div>

            {/* App Info */}
            <div className="mt-auto pt-6">
                <div className="text-center text-gray-500 text-sm">
                    <p>Mellow Music Player</p>
                    <p>Version 2.0</p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
