import { Link } from 'react-router';
import { categoryInfo, STRENGTH_LABEL } from '../lib/constants';
import { timeAgo } from '../lib/format';
import ItemImage from './ItemImage';

export function TypeBadge({ type }) {
    return <span className={`badge badge--${type}`}>{type === 'lost' ? 'Lost' : 'Found'}</span>;
}

/** `index` drives the staggered entrance (see DESIGN.md: Results grid). */
export default function ItemCard({ item, match, index = 0 }) {
    const cat = categoryInfo(item.category);
    const resolved = item.status === 'resolved';
    return (
        <article className={`card item-card ${resolved ? 'is-resolved' : ''}`} style={{ '--i': index }}>
            <Link to={`/item/${item._id}`} className="item-card__link">
                <div className="item-card__media">
                    <ItemImage item={item} />
                    <div className="item-card__badges">
                        <TypeBadge type={item.type} />
                        {resolved && <span className="badge badge--resolved">Reunited 🎉</span>}
                        {item.isOwner && <span className="badge badge--mine">Your post</span>}
                    </div>
                </div>
                <div className="item-card__body">
                    <h3 className="item-card__title">{item.name}</h3>
                    <p className="item-card__meta">
                        <span aria-hidden="true">📍</span> {item.location}
                    </p>
                    <p className="item-card__meta muted">
                        {cat.icon} {cat.label} · {item.type === 'lost' ? 'Lost' : 'Found'} {timeAgo(item.date)}
                    </p>
                    {match && (
                        <div className="match-info">
                            <span className={`strength strength--${match.strength}`}>{STRENGTH_LABEL[match.strength]}</span>
                            <div
                                className="meter"
                                role="meter"
                                aria-label="Match strength"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.min(100, match.score)}
                            >
                                <span
                                    className={`meter__fill meter__fill--${match.strength}`}
                                    style={{ width: `${Math.max(8, Math.min(100, match.score))}%` }}
                                />
                            </div>
                            <ul className="reasons">
                                {match.reasons.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Link>
        </article>
    );
}
