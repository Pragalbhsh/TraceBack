import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../lib/api';
import { categoryInfo } from '../lib/constants';
import { contactHref, formatDate, timeAgo } from '../lib/format';
import ItemImage from '../components/ItemImage';
import { TypeBadge } from '../components/ItemCard';
import { Alert, EmptyState, MatchGrid, SafetyTips, Spinner } from '../components/ui';
import useTitle from '../lib/useTitle';

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [item, setItem] = useState(null);
    const [matches, setMatches] = useState(null);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    useTitle(item?.name);

    useEffect(() => {
        const ctrl = new AbortController();
        setItem(null);
        setMatches(null);
        setNotFound(false);
        setError('');
        api(`/items/${id}`, { signal: ctrl.signal })
            .then(setItem)
            .catch((err) => {
                if (err.name === 'AbortError') return;
                if (err.status === 404 || err.status === 400) setNotFound(true);
                else setError(err.message);
            });
        api(`/items/${id}/matches`, { signal: ctrl.signal })
            .then(setMatches)
            .catch(() => setMatches([]));
        return () => ctrl.abort();
    }, [id]);

    if (notFound) {
        return (
            <div className="container section">
                <EmptyState icon="🕳️" title="This post isn't here anymore">
                    <p>It may have been deleted by the person who posted it.</p>
                    <Link to="/" className="btn btn--ghost">
                        Back to all items
                    </Link>
                </EmptyState>
            </div>
        );
    }
    if (error) {
        return (
            <div className="container section">
                <Alert>{error}</Alert>
            </div>
        );
    }
    if (!item) return <Spinner />;

    const cat = categoryInfo(item.category);
    const resolved = item.status === 'resolved';
    const href = contactHref(item.contact);

    const setStatus = async (status) => {
        setBusy(true);
        try {
            setItem(await api(`/items/${item._id}`, { method: 'PATCH', body: { status } }));
            setNotice(status === 'resolved' ? '🎉 Wonderful! Marked as reunited. Thank you for using TraceBack.' : 'Post reopened.');
        } catch (err) {
            setNotice(err.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        setBusy(true);
        try {
            await api(`/items/${item._id}`, { method: 'DELETE' });
            navigate('/my-posts', { state: { notice: 'Post deleted.' } });
        } catch (err) {
            setNotice(err.message);
            setBusy(false);
        }
    };

    const share = async () => {
        const url = window.location.href;
        const text = `${item.type === 'lost' ? 'Lost' : 'Found'}: ${item.name} near ${item.location}. Can you help?`;
        try {
            if (navigator.share) await navigator.share({ title: 'TraceBack', text, url });
            else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                setNotice('Link copied - share it in your group chats!');
            }
        } catch {
            /* user cancelled */
        }
    };

    return (
        <div className="container section">
            <Link to="/" className="back-link">
                ← All items
            </Link>

            <Alert kind="info">{notice}</Alert>

            <div className="detail">
                <div className="detail__media">
                    <ItemImage item={item} className="detail__image" />
                </div>

                <div className="detail__info">
                    <div className="detail__badges">
                        <TypeBadge type={item.type} />
                        {resolved && <span className="badge badge--resolved">Reunited 🎉</span>}
                    </div>
                    <h1 className="detail__title">{item.name}</h1>

                    <dl className="facts">
                        <div>
                            <dt>{item.type === 'lost' ? 'Last seen' : 'Found at'}</dt>
                            <dd>📍 {item.location}</dd>
                        </div>
                        <div>
                            <dt>When</dt>
                            <dd>
                                📅 {formatDate(item.date)} <span className="muted">({timeAgo(item.date)})</span>
                            </dd>
                        </div>
                        <div>
                            <dt>Category</dt>
                            <dd>
                                {cat.icon} {cat.label}
                            </dd>
                        </div>
                        {item.postedBy && (
                            <div>
                                <dt>Posted by</dt>
                                <dd>
                                    {item.postedBy} · {timeAgo(item.createdAt)}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {item.description && <p className="detail__desc">{item.description}</p>}

                    {!item.isOwner && !resolved && (
                        <div className="contact-box">
                            <h2>{item.type === 'lost' ? 'Found it? Let them know' : 'Is this yours?'}</h2>
                            {item.contact ? (
                                <>
                                    <p className="contact-box__value">{item.contact}</p>
                                    <div className="row">
                                        {href && (
                                            <a className="btn btn--primary" href={href}>
                                                {href.startsWith('mailto') ? '✉️ Send email' : '📞 Call'}
                                            </a>
                                        )}
                                        <button
                                            className="btn btn--ghost"
                                            onClick={() =>
                                                navigator.clipboard
                                                    ?.writeText(item.contact)
                                                    .then(() => setNotice('Contact copied.'))
                                            }
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="muted">
                                        To protect people's privacy, contact details are only shown to signed-in users.
                                    </p>
                                    <Link to="/login" state={{ from: location }} className="btn btn--primary">
                                        Log in to see contact details
                                    </Link>
                                </>
                            )}
                        </div>
                    )}

                    {item.isOwner && (
                        <div className="owner-box">
                            <h2>This is your post</h2>
                            {item.contact && (
                                <p className="muted">
                                    People will contact you at: <strong>{item.contact}</strong>
                                </p>
                            )}
                            <div className="row">
                                {resolved ? (
                                    <button className="btn btn--ghost" disabled={busy} onClick={() => setStatus('open')}>
                                        Reopen post
                                    </button>
                                ) : (
                                    <button className="btn btn--found" disabled={busy} onClick={() => setStatus('resolved')}>
                                        ✅ Mark as reunited
                                    </button>
                                )}
                                <Link className="btn btn--ghost" to={`/item/${item._id}/edit`}>
                                    Edit
                                </Link>
                                <button className="btn btn--danger-ghost" disabled={busy} onClick={remove}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="row">
                        <button className="btn btn--ghost btn--sm" onClick={share}>
                            🔗 Share this post
                        </button>
                    </div>

                    {!resolved && <SafetyTips type={item.type} />}
                </div>
            </div>

            {!resolved && (
                <section className="section" aria-labelledby="matches-heading">
                    <div className="section__head">
                        <h2 id="matches-heading">
                            {item.type === 'lost' ? 'Found items that might be this' : 'Lost reports that might match'}
                        </h2>
                    </div>
                    {matches === null ? (
                        <Spinner label="Looking for matches..." />
                    ) : matches.length ? (
                        <MatchGrid matches={matches} />
                    ) : (
                        <EmptyState icon="⏳" title="No matches yet">
                            <p>
                                {item.isOwner
                                    ? "We'll keep checking new posts and email you when something looks like a match."
                                    : 'New posts are checked automatically. Share this post to help it reach the right person.'}
                            </p>
                        </EmptyState>
                    )}
                </section>
            )}
        </div>
    );
}
