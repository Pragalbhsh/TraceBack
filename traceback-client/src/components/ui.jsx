import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useReveal } from '../lib/motion';
import ItemCard from './ItemCard';

export function Spinner({ label = 'Loading...' }) {
    return (
        <div className="spinner-wrap" role="status">
            <div className="spinner" aria-hidden="true" />
            <span className="muted">{label}</span>
        </div>
    );
}

/** Inline message. Errors slide in and shake once each time the message changes. */
export function Alert({ children, kind = 'error' }) {
    if (!children) return null;
    return (
        <div
            key={typeof children === 'string' ? children : undefined}
            className={`alert alert--${kind} is-new`}
            role={kind === 'error' ? 'alert' : 'status'}
        >
            {children}
        </div>
    );
}

export function EmptyState({ icon = '🔎', title, children }) {
    return (
        <div className="empty">
            <div className="empty__icon" aria-hidden="true">
                {icon}
            </div>
            <h3>{title}</h3>
            {children && <div className="muted">{children}</div>}
        </div>
    );
}

/** Wrap pages that need a logged-in user. */
export function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    return children;
}

export function MatchGrid({ matches }) {
    return (
        <div className="grid">
            {matches.map((m, i) => (
                <ItemCard key={m._id} item={m} match={m} index={i} />
            ))}
        </div>
    );
}

/** Fades its content up once it scrolls into view. Children with class "reveal-item" follow in sequence. */
export function Reveal({ as: Tag = 'section', className = '', children, ...rest }) {
    const [ref, visible] = useReveal();
    return (
        <Tag ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} {...rest}>
            {children}
        </Tag>
    );
}

export function SkeletonGrid({ count = 8, label = 'Loading items...' }) {
    return (
        <>
            <span className="sr-only" role="status">
                {label}
            </span>
            <div className="grid" aria-hidden="true">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="card skeleton-card" style={{ '--i': i }}>
                        <div className="skeleton skeleton--media" />
                        <div className="skeleton-card__body">
                            <div className="skeleton skeleton--line w-70" />
                            <div className="skeleton skeleton--line w-50" />
                            <div className="skeleton skeleton--line w-40" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export function DetailSkeleton() {
    return (
        <div className="container section" aria-busy="true">
            <span className="sr-only" role="status">
                Loading item...
            </span>
            <div className="detail" aria-hidden="true">
                <div className="detail__media skeleton" />
                <div>
                    <div className="skeleton skeleton--line w-30" />
                    <div className="skeleton skeleton--title" />
                    <div className="skeleton skeleton--line w-90" />
                    <div className="skeleton skeleton--line w-70" />
                    <div className="skeleton skeleton--block" />
                    <div className="skeleton skeleton--block" />
                </div>
            </div>
        </div>
    );
}

/** Check mark that draws itself. */
export function CheckDraw() {
    return (
        <svg className="check-draw" viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="30" />
            <path d="M23 37l9 9 17-19" />
        </svg>
    );
}

export function Switch({ checked, onChange, title, description }) {
    return (
        <label className="switch card">
            <input type="checkbox" role="switch" checked={checked} onChange={onChange} />
            <span className="switch__track" aria-hidden="true" />
            <span>
                <strong>{title}</strong>
                {description && <small className="muted">{description}</small>}
            </span>
        </label>
    );
}

export function SafetyTips({ type }) {
    return (
        <aside className="tips">
            <h4>🛡️ Staying safe</h4>
            <ul>
                <li>Meet somewhere public and busy, or hand it over at a security desk / reception.</li>
                {type === 'found' ? (
                    <li>Ask the claimer to describe something not shown in the post (a scratch, wallpaper, contents).</li>
                ) : (
                    <li>Be ready to prove it's yours: describe marks, contents, or show a photo or receipt.</li>
                )}
                <li>Never pay a "reward" up front or share bank / OTP details.</li>
            </ul>
        </aside>
    );
}
