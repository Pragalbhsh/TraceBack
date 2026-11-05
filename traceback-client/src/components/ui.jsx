import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import ItemCard from './ItemCard';

export function Spinner({ label = 'Loading...' }) {
    return (
        <div className="spinner-wrap" role="status">
            <div className="spinner" aria-hidden="true" />
            <span className="muted">{label}</span>
        </div>
    );
}

export function Alert({ children, kind = 'error' }) {
    if (!children) return null;
    return (
        <div className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
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
            {matches.map((m) => (
                <ItemCard key={m._id} item={m} match={m} />
            ))}
        </div>
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
