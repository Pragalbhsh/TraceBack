import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { STRENGTH_LABEL } from '../lib/constants';
import { timeAgo } from '../lib/format';
import { celebrate } from '../lib/celebrate';
import ItemImage from '../components/ItemImage';
import { TypeBadge } from '../components/ItemCard';
import { useToast } from '../components/Toast';
import { Alert, EmptyState, Switch } from '../components/ui';
import useTitle from '../lib/useTitle';

function RowSkeleton() {
    return (
        <ul className="my-list" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <li key={i} className="my-row card" style={{ '--i': i }}>
                    <div className="my-row__thumb skeleton" />
                    <div className="my-row__body">
                        <div className="skeleton skeleton--line w-50" />
                        <div className="skeleton skeleton--line w-70" />
                        <div className="skeleton skeleton--line w-30" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function MyPosts() {
    useTitle('My posts');
    const { user, updateMe } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [alerts, setAlerts] = useState(user?.emailAlerts ?? true);

    useEffect(() => {
        api('/items/mine')
            .then(setItems)
            .catch((err) => setError(err.message));
    }, []);

    const toggleAlerts = async (e) => {
        const emailAlerts = e.target.checked;
        setAlerts(emailAlerts); // update straight away, undo if saving fails
        try {
            await updateMe({ emailAlerts });
            toast(emailAlerts ? "Match emails turned on. We'll let you know about likely matches." : 'Match emails turned off.');
        } catch (err) {
            setAlerts(!emailAlerts);
            toast(err.message, { kind: 'error' });
        }
    };

    const markReunited = async (item, button) => {
        try {
            const updated = await api(`/items/${item._id}`, { method: 'PATCH', body: { status: 'resolved' } });
            celebrate({ from: button });
            setItems((list) => list.map((i) => (i._id === item._id ? { ...i, ...updated, matchCount: 0 } : i)));
            toast(`🎉 "${item.name}" marked as reunited. Thank you!`, { kind: 'success', duration: 5000 });
        } catch (err) {
            toast(err.message, { kind: 'error' });
        }
    };

    const open = items?.filter((i) => i.status !== 'resolved') || [];
    const done = items?.filter((i) => i.status === 'resolved') || [];

    return (
        <div className="container section">
            <div className="section__head">
                <div>
                    <h1 className="rise">My posts</h1>
                    <p className="muted rise" style={{ '--i': 1 }}>
                        Hi {user?.name?.split(' ')[0]}! Here's everything you've posted.
                    </p>
                </div>
                <Link to="/report" className="btn btn--primary btn--shine rise" style={{ '--i': 1 }}>
                    + Report item
                </Link>
            </div>

            <div className="rise" style={{ '--i': 2 }}>
                <Switch
                    checked={alerts}
                    onChange={toggleAlerts}
                    title="Email me about possible matches"
                    description={`Sent to ${user?.email} when someone posts an item that looks like one of yours.`}
                />
            </div>

            <Alert>{error}</Alert>

            {items === null && !error ? (
                <RowSkeleton />
            ) : items?.length === 0 ? (
                <EmptyState icon="📭" title="You haven't posted anything yet">
                    <Link className="btn btn--primary" to="/report">
                        Report a lost or found item
                    </Link>
                </EmptyState>
            ) : (
                <>
                    {open.length > 0 && <h2 className="list-heading">Open ({open.length})</h2>}
                    <ul className="my-list">
                        {open.map((item, i) => (
                            <MyRow key={item._id} item={item} index={i} onReunited={(btn) => markReunited(item, btn)} />
                        ))}
                    </ul>
                    {done.length > 0 && <h2 className="list-heading">Reunited 🎉 ({done.length})</h2>}
                    <ul className="my-list">
                        {done.map((item, i) => (
                            <MyRow key={item._id} item={item} index={i} />
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

function MyRow({ item, index, onReunited }) {
    return (
        <li className="my-row card" style={{ '--i': index }}>
            <Link to={`/item/${item._id}`} className="my-row__thumb" aria-hidden="true" tabIndex={-1}>
                <ItemImage item={item} />
            </Link>
            <div className="my-row__body">
                <div className="my-row__title">
                    <TypeBadge type={item.type} />
                    <Link to={`/item/${item._id}`}>
                        <strong>{item.name}</strong>
                    </Link>
                </div>
                <p className="muted small">
                    📍 {item.location} · posted {timeAgo(item.createdAt)}
                </p>
                {item.status !== 'resolved' &&
                    (item.matchCount > 0 ? (
                        <Link to={`/item/${item._id}#matches-heading`} className={`strength strength--${item.bestMatch} chip-pulse`}>
                            {item.matchCount} possible {item.matchCount === 1 ? 'match' : 'matches'} · best: {STRENGTH_LABEL[item.bestMatch]}
                        </Link>
                    ) : (
                        <span className="muted small">No matches yet - we'll keep looking.</span>
                    ))}
            </div>
            {onReunited && (
                <div className="my-row__actions">
                    <button className="btn btn--found btn--sm" onClick={(e) => onReunited(e.currentTarget)}>
                        ✅ Reunited
                    </button>
                    <Link className="btn btn--ghost btn--sm" to={`/item/${item._id}/edit`}>
                        Edit
                    </Link>
                </div>
            )}
        </li>
    );
}
