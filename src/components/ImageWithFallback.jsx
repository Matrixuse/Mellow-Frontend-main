import React, { useEffect, useState } from 'react';

// Lightweight image loader that verifies a remote URL before setting it
// on an <img> element. If the HEAD check fails or times out, a fallback
// placeholder URL is used instead. This reduces visible broken images and
// avoids rendering an <img> with a URL that is known to 404.
const DEFAULT_PLACEHOLDER = 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music';

const ImageWithFallback = ({ src, alt = '', className = '', fallback = DEFAULT_PLACEHOLDER, checkTimeout = 2500, ...rest }) => {
    // Show the provided src optimistically to avoid a placeholder-first flicker.
    // If the optimistic load fails, replace with the fallback. If multiple
    // candidates are provided, try them sequentially in the background.
    const candidates = Array.isArray(src) ? src.filter(Boolean) : (src ? [src] : []);
    const initial = candidates.length > 0 ? candidates[0] : fallback;
    const [displaySrc, setDisplaySrc] = useState(initial);

    useEffect(() => {
        let cancelled = false;
        const list = Array.isArray(src) ? src.filter(Boolean) : (src ? [src] : []);
        if (list.length === 0) {
            setDisplaySrc(fallback);
            return () => { cancelled = true; };
        }

        // Start optimistic: show first candidate immediately, then verify it.
        setDisplaySrc(list[0]);

        let idx = 0;
        const verifyNext = (url) => {
            const img = new Image();
            img.onload = () => { if (!cancelled) setDisplaySrc(url); };
            img.onerror = () => {
                if (cancelled) return;
                idx += 1;
                if (idx < list.length) verifyNext(list[idx]);
                else if (!cancelled) setDisplaySrc(fallback);
            };
            try { img.src = url; } catch (e) { img.onerror(); }
        };

        // Kick off verification for the optimistic candidate
        verifyNext(list[0]);

        return () => { cancelled = true; };
    }, [src, fallback]);

    return <img src={displaySrc} alt={alt} className={className} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = fallback; }} referrerPolicy="no-referrer" {...rest} />;
};

export default ImageWithFallback;
