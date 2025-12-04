import React, { useState } from 'react';
import { login, register } from '../api/authService';

const AuthForm = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let data;
            if (isLogin) {
                data = await login({ email, password });
            } else {
                // Register karne ke baad automatically login bhi ho jayega
                data = await register({ name, email, password });
            }
            if (typeof onLoginSuccess === 'function') {
                try {
                    onLoginSuccess(data);
                } catch (err) {
                    // Surface a friendly error and log the underlying problem
                    // so that a malformed login response doesn't crash the WebView.
                    // eslint-disable-next-line no-console
                    console.error('onLoginSuccess handler threw:', err);
                    setError('Unexpected error during login. Please try again.');
                }
            } else {
                console.warn('onLoginSuccess is not a function');
            }
        } catch (err) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-center text-white">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                    <div>
                        <label className="text-sm font-medium text-gray-300">Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                )}
                <div>
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                    {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>
            </form>
            <p className="text-sm text-center text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); }} className="ml-1 font-semibold text-blue-400 hover:underline">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
};

export default AuthForm;
