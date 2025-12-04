import React from 'react';
import { Instagram, Twitter, Facebook } from 'lucide-react';

// Ismein ab 'onDeveloperClick' prop aayega, jise App.jsx se power milegi
const Footer = ({ onDeveloperClick }) => (
    <footer className="w-full pt-12 pb-4 text-gray-400 text-sm mt-8">
        <div className="border-t border-gray-700 mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            
            {/* Column 1: Company */}
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Company</h3>
                <button className="block text-left hover:text-white">About</button>
                <button className="block text-left hover:text-white">Jobs</button>
                <button className="block text-left hover:text-white">For the Record</button>
            </div>

            {/* Column 2: Communities */}
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Communities</h3>
                <button className="block text-left hover:text-white">For Artists</button>
                {/* YEH SABSE ZAROORI BADLAAV HAI */}
                {/* Yeh ab ek simple button hai jo Admin panel kholega */}
                <button onClick={onDeveloperClick} className="block text-left hover:text-white">Developers</button>
                <button className="block text-left hover:text-white">Investors</button>
                <button className="block text-left hover:text-white">Vendors</button>
            </div>

            {/* Column 3: Useful links */}
            <div className="space-y-3">
                <h3 className="font-bold text-white mb-4">Useful links</h3>
                <button className="block text-left hover:text-white">Support</button>
                <button ><a href="https://t.me/+3Iutz1P74CgwNDM9" className="block text-left hover:text-white">Free Mobile App</a></button>
                <button className="block text-left hover:text-white"><a href="/feedback">Feedback</a></button>
            </div>

            {/* Column 4: Musious Plans */}
            <div className="space-y-3 col-span-2 md:col-span-1">
                <h3 className="font-bold text-white mb-4">Musious Plans</h3>
                <button className="block text-left hover:text-white">Musious Individual</button>
                <button className="block text-left hover:text-white">Musious Family</button>
                <button className="block text-left hover:text-white">Musious Student</button>
                <button className="block text-left hover:text-white">Musious Free</button>
            </div>

            {/* Social Icons */}
             <div className="col-span-2 md:col-span-1 flex md:justify-end items-start gap-4">
                <a href="#!" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Instagram size={20} className="text-white" /></a>
                <a href="#!" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Twitter size={20} className="text-white" /></a>
                <a href="#!" className="bg-gray-800 p-3 rounded-full hover:bg-gray-700"><Facebook size={20} className="text-white" /></a>
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
                <span>© 2025 Musious</span>
                <span>Creators: Naman, Shreyas</span>
            </div>
            <div></div>
        </div>
    </footer>
);

export default Footer;

