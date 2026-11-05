import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { STRENGTH_LABEL } from '../lib/constants';
import { timeAgo } from '../lib/format';
import ItemImage from '../components/ItemImage';
import { TypeBadge } from '../components/ItemCard';
import { Alert, EmptyState, Spinner } from '../components/ui';
import useTitle from '../lib/useTitle';

export default function MyPosts() {
    useTitle('My posts');
    const { user, updateMe } = useAuth();
    const location = useLocation();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(location.state?.notice || '');
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
            setNotice(emailAlerts ? "Match emails turned on. We'll let you know about likely matches." : 'Match emails turned off.');
        } catch (err) {
            setAlerts(!emailAlerts);
            setError(err.message);
        }
    };

    const markReunited = async (item) => {
        try {
            const updated = await api(`/items/${item._id}`, { method: 'PATCH', body: { status: 'resolved' } });
            setItems((list) => list.map((i) => (i._id === item._id ? { ...i, ...updated, matchCount: 0 } : i)));
            setNotice(`🎉 "${item.name}" marked as reunited. Thank you!`);
        } catch (err) {
            setError(err.message);
        }
    };

    const open = items?.filter((i) => i.status !== 'resolved') || [];
    const done = items?.filter((i) => i.status === 'resolved') || [];

    return (
        <div className="container section">
            <div className="section__head">
                <div>
                    <h1>My posts</h1>
                    <p className="muted">Hi {user?.name?.split(' ')[0]}! Here's everything you've posted.</p>
                </div>
                <Link to="/report" className="btn btn--primary">
                    + Report item
                </Link>
            </div>

            <label className="toggle card">
                <input type="checkbox" checked={alerts} onChange={toggleAlerts} />
                <span>
                    <strong>Email me about possible matches</strong>
                    <small className="muted">Sent to {user?.email} when someone posts an item that looks like one of yours.</small>
                </span>
            </label>

            <Alert kind="info">{notice}</Alert>
            <Alert>{error}</Alert>

            {items === null && !error ? (
                <Spinner />
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
                        {open.map((item) => (
                            <MyRow key={item._id} item={item} onReunited={() => markReunited(item)} />
                        ))}
                    </ul>
                    {done.length > 0 && <h2 className="list-heading">Reunited 🎉 ({done.length})</h2>}
                    <ul className="my-list">
                        {done.map((item) => (
                            <MyRow key={item._id} item={item} />
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

function MyRow({ item, onReunited }) {
    return (
        <li className="my-row card">
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
                        <Link to={`/item/${item._id}#matches-heading`} className={`strength strength--${item.bestMatch}`}>
                            {item.matchCount} possible {item.matchCount === 1 ? 'match' : 'matches'} · best: {STRENGTH_LABEL[item.bestMatch]}
                        </Link>
                    ) : (
                        <span className="muted small">No matches yet - we'll keep looking.</span>
                    ))}
            </div>
            {onReunited && (
                <div className="my-row__actions">
                    <button className="btn btn--found btn--sm" onClick={onReunited}>
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
