import React, { useEffect, useState } from 'react';

// Lightweight image loader that verifies a remote URL before setting it
// on an <img> element. If the HEAD check fails or times out, a fallback
// placeholder URL is used instead. This reduces visible broken images and
// avoids rendering an <img> with a URL that is known to 404.
const DEFAULT_PLACEHOLDER = 'https://placehold.co/200x200/1F2937/FFFFFF?text=Music';

const ImageWithFallback = ({ src, alt = '', className = '', fallback = DEFAULT_PLACEHOLDER, checkTimeout = 2500, ...rest }) => {
    const [displaySrc, setDisplaySrc] = useState(fallback);

    useEffect(() => {
        let cancelled = false;
        if (!src) {
            setDisplaySrc(fallback);
            return;
        }

        // Create a DOM Image to preload the resource. This avoids using HEAD
        // requests which some hosts or CDNs may block or CORS-restrict. The
        // browser will handle the cross-origin request for the image and
        // correctly trigger onload/onerror callbacks without requiring a
        // separate fetch() call.
        const img = new Image();
        let timeoutId = null;

        const handleSuccess = () => {
            if (cancelled) return;
            clearTimeout(timeoutId);
            setDisplaySrc(src);
        };

        const handleFailure = () => {
            if (cancelled) return;
            clearTimeout(timeoutId);
            setDisplaySrc(fallback);
        };

        img.onload = handleSuccess;
        img.onerror = handleFailure;
        // attempt to load; some CDNs require the crossorigin attribute for caching
        try { img.crossOrigin = 'anonymous'; } catch (e) {}
        img.src = src;

        // Fallback timeout in case the image load hangs
        timeoutId = setTimeout(() => {
            if (cancelled) return;
            // If still not loaded after timeout, treat as failure
            try { img.onload = null; img.onerror = null; } catch (e) {}
            setDisplaySrc(fallback);
        }, checkTimeout);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            try { img.onload = null; img.onerror = null; } catch (e) {}
        };
    }, [src, fallback, checkTimeout]);

    return <img src={displaySrc} alt={alt} className={className} onError={(e) => { e.target.onerror = null; e.target.src = fallback; }} {...rest} />;
};

export default ImageWithFallback;
