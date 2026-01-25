import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

const ProfilePage = () => {
    const navigate = useNavigate();
    const context = useOutletContext() || {};
    const user = context.user || {};
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

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
        <div className="w-full h-full bg-gray-900 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <button onClick={handleBack} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-white flex-1 text-center">Profile</h1>
                <div className="w-10"></div>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-md mx-auto">
                    {/* Photo Section */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src="/customer.jpg"
                            alt="Profile"
                            className="w-40 h-40 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                            onError={(e) => {
                                e.target.src = 'https://placehold.co/200x200/1F2937/FFFFFF?text=User';
                            }}
                        />
                    </div>

                    {/* User Info Section */}
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-gray-300 font-semibold mb-2">Name</label>
                            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                                <p className="text-white">{name || 'Not set'}</p>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-gray-300 font-semibold mb-2">Email</label>
                            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                                <p className="text-white break-all">{email || 'Not set'}</p>
                            </div>
                        </div>

                        <p className="text-blue-300 text-sm">
                            Don't worry, Your profile information is secure.
                        </p>
                        <p>Version 1.2.11.099</p>
                    </div>
                </div>
            </div>

            {/* Bottom Nav for mobile */}
            <div className="md:hidden border-t border-gray-700 bg-gray-900 flex-shrink-0">
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
