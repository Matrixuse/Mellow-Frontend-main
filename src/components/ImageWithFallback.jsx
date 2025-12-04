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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), checkTimeout);

        // Use HEAD to verify resource existence (smaller response than GET)
        fetch(src, { method: 'HEAD', signal: controller.signal, cache: 'no-cache' })
            .then(res => {
                if (cancelled) return;
                if (res && res.ok) setDisplaySrc(src);
                else setDisplaySrc(fallback);
            })
            .catch(() => {
                if (cancelled) return;
                setDisplaySrc(fallback);
            })
            .finally(() => clearTimeout(timeoutId));

        return () => { cancelled = true; controller.abort(); clearTimeout(timeoutId); };
    }, [src, fallback, checkTimeout]);

    return <img src={displaySrc} alt={alt} className={className} onError={(e) => { e.target.onerror = null; e.target.src = fallback; }} {...rest} />;
};

export default ImageWithFallback;
