// Backend base URL: prefer Vite runtime env, then runtime-injected window.__API_URL, then the live Render URL as final fallback.
const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/songs`;

export const getSongs = async (token) => {
    // Browser ki memory se user ka data nikaalna
    // Ab token ko sidhe argument se le rahe hain
    // const user = JSON.parse(localStorage.getItem('user'));
    // let token = null;

    // User ke data se token nikaalna
    // if (user && user.token) {
    //     token = user.token;
    // }

    // Agar token nahi hai, toh ek khaali list bhej do taaki app crash na ho
    if (!token) {
        console.warn('Authentication token not found, cannot fetch songs.');
        return []; 
    }

    // Backend server ko request bhejna
    const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
            // Hum request ke saath security token bhej rahe hain
            'Authorization': `Bearer ${token}`
        }
    });

    // Agar server se koi error aaye, toh use handle karna
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch songs');
    }

    // Agar sab theek hai, toh gaano ki list bhej do
    const data = await response.json();
    // Normalize song objects so frontend can rely on `id` and `coverUrl`
    if (Array.isArray(data)) {
        return data.map(s => ({
            ...s,
            id: s.id || s._id || (s._id && s._id.$oid) || String(s.id || s._id || (s._id && s._id.$oid)),
            coverUrl: s.coverUrl || s.cover_url || s.cover || ''
        }));
    }
    return data;
};

