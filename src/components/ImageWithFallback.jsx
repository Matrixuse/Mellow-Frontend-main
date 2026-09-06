import React, { useEffect, useState } from 'react';

const DEFAULT_PLACEHOLDER = 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music';

const ImageWithFallback = ({ src, alt = '', className = '', fallback = DEFAULT_PLACEHOLDER, ...rest }) => {
    const candidates = Array.isArray(src) ? src.filter(Boolean) : (src ? [src] : []);
    const initial = candidates.length > 0 ? candidates[0] : fallback;
    const [displaySrc, setDisplaySrc] = useState(initial);

    useEffect(() => {
        const list = Array.isArray(src) ? src.filter(Boolean) : (src ? [src] : []);
        const filteredList = list.filter((url) => typeof url === 'string' && !/cloudinary\.com/i.test(url));
        if (filteredList.length === 0) {
            setDisplaySrc(fallback);
            return undefined;
        }

        setDisplaySrc(filteredList[0]);

        return undefined;
    }, [src, fallback]);

    return <img src={displaySrc} alt={alt} className={className} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = fallback; }} referrerPolicy="no-referrer" {...rest} />;
};

export default ImageWithFallback;
