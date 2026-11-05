import { Link } from 'react-router';
import { categoryInfo, STRENGTH_LABEL } from '../lib/constants';
import { timeAgo } from '../lib/format';
import ItemImage from './ItemImage';

export function TypeBadge({ type }) {
    return <span className={`badge badge--${type}`}>{type === 'lost' ? 'Lost' : 'Found'}</span>;
}

export default function ItemCard({ item, match }) {
    const cat = categoryInfo(item.category);
    const resolved = item.status === 'resolved';
    return (
        <article className={`card item-card ${resolved ? 'is-resolved' : ''}`}>
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
