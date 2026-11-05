import { useState } from 'react';
import { imageUrl } from '../lib/api';
import { categoryInfo } from '../lib/constants';

/** The item's photo, or a friendly category icon if there is none (or it fails to load). */
export default function ItemImage({ item, className = '' }) {
    const [failed, setFailed] = useState(false);
    const src = imageUrl(item.image);
    if (src && !failed) {
        return (
            <img
                className={`item-image ${className}`}
                src={src}
                alt={`Photo of ${item.name}`}
                loading="lazy"
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
