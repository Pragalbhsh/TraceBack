import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { categoryInfo } from '../lib/constants';

// Photos already shown once appear instantly next time (no repeated blur-in when filters change).
const seen = new Set();

/** The item's photo (blurs in on first load), or a category icon if there is none or it fails to load. */
export default function ItemImage({ item, className = '' }) {
    const src = imageUrl(item.image);
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(() => seen.has(src));
    const img = useRef(null);

    // Cached images can finish loading before React attaches onLoad.
    useEffect(() => {
        if (img.current?.complete && img.current.naturalWidth > 0) {
            seen.add(src);
            setLoaded(true);
        }
    }, [src]);

    if (src && !failed) {
        return (
            <img
                ref={img}
                className={`item-image ${loaded ? 'is-loaded' : ''} ${className}`}
                src={src}
                alt={`Photo of ${item.name}`}
                loading="lazy"
                decoding="async"
                onLoad={() => {
                    seen.add(src);
                    setLoaded(true);
                }}
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <div className={`item-image item-image--placeholder item-image--${item.type} ${className}`} aria-hidden="true">
            <span>{categoryInfo(item.category).icon}</span>
        </div>
    );
}
