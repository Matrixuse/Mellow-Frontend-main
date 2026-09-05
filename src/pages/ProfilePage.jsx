import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

const ProfilePage = () => {
    const navigate = useNavigate();
    const context = useOutletContext() || {};
    const user = context.user || {};
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [following, setFollowing] = useState(false);

    const followKey = `follow_user_${user?.id || 'self'}`;

    useEffect(() => {
        try {
            const stored = localStorage.getItem(followKey);
            setFollowing(stored === 'true');
        } catch (e) {
            setFollowing(false);
        }
    }, [followKey]);

    const toggleFollow = () => {
        try {
            const next = !following;
            localStorage.setItem(followKey, next ? 'true' : 'false');
            setFollowing(next);
        } catch (e) {
            setFollowing(prev => !prev);
        }
    };

    // Load profile data on mount
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="w-full h-full bg-[#0f0f0f] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <button onClick={handleBack} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#1f1f1f]">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-white flex-1 text-center">Profile</h1>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-md mx-auto">
                    {/* User Info Section */}
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-gray-300 font-semibold mb-2">Name</label>
                            <div className="bg-[#282828]/50 border border-gray-600 rounded-lg p-3">
                                <p className="text-white">{name || 'Not set'}</p>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-gray-300 font-semibold mb-2">Email</label>
                            <div className="bg-[#282828]/50 border border-gray-600 rounded-lg p-3">
                                <p className="text-white break-all">{email || 'Not set'}</p>
                            </div>
                        </div>

                        <p className="text-red-300 text-sm">
                            Don't worry, Your profile information is secure.
                        </p>
                        <p>Version 1.2.11.099</p>
                    </div>
                </div>
            </div>

            {/* Bottom Nav for mobile */}
            <div className="md:hidden border-t border-gray-700 bg-[#0f0f0f] flex-shrink-0">
                <div className="h-14 flex items-center px-4">
                    <button
                        onClick={handleBack}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors font-medium"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
