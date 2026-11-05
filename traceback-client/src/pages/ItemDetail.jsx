import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../lib/api';
import { categoryInfo } from '../lib/constants';
import { contactHref, formatDate, timeAgo } from '../lib/format';
import { celebrate } from '../lib/celebrate';
import ItemImage from '../components/ItemImage';
import { TypeBadge } from '../components/ItemCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { Alert, DetailSkeleton, EmptyState, MatchGrid, Reveal, SafetyTips, SkeletonGrid } from '../components/ui';
import useTitle from '../lib/useTitle';

/** Button that briefly shows "✓ Done" after its action succeeds. */
function FeedbackButton({ onClick, children, done = '✓ Copied', className = 'btn btn--ghost' }) {
    const [ok, setOk] = useState(false);
    useEffect(() => {
        if (!ok) return undefined;
        const t = setTimeout(() => setOk(false), 1600);
        return () => clearTimeout(t);
    }, [ok]);
    return (
        <button
            type="button"
            className={className}
            onClick={async () => {
                if ((await onClick()) !== false) setOk(true);
            }}
        >
            {ok ? done : children}
        </button>
    );
}

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [item, setItem] = useState(null);
    const [matches, setMatches] = useState(null);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
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
            .catch((err) => err.name !== 'AbortError' && setMatches([]));
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
    if (!item) return <DetailSkeleton />;

    const cat = categoryInfo(item.category);
    const resolved = item.status === 'resolved';
    const href = contactHref(item.contact);

    const setStatus = async (status, button) => {
        setBusy(true);
        try {
            setItem(await api(`/items/${item._id}`, { method: 'PATCH', body: { status } }));
            if (status === 'resolved') {
                celebrate({ from: button });
                toast('🎉 Wonderful! Marked as reunited. Thank you for using TraceBack.', { kind: 'success', duration: 5000 });
            } else {
                toast('Post reopened - it will show up in searches and matching again.');
            }
        } catch (err) {
            toast(err.message, { kind: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await api(`/items/${item._id}`, { method: 'DELETE' });
            toast('Post deleted.');
            navigate('/my-posts');
        } catch (err) {
            toast(err.message, { kind: 'error' });
            setBusy(false);
            setConfirmDelete(false);
        }
    };

    const copy = async (text, message) => {
        try {
            await navigator.clipboard.writeText(text);
            toast(message, { kind: 'success' });
            return true;
        } catch {
            toast("Couldn't copy - please select and copy it manually.", { kind: 'error' });
            return false;
        }
    };

    const share = async () => {
        const url = window.location.href;
        const text = `${item.type === 'lost' ? 'Lost' : 'Found'}: ${item.name} near ${item.location}. Can you help?`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'TraceBack', text, url });
                return true;
            } catch {
                return false; // cancelled
            }
        }
        return copy(`${text} ${url}`, 'Link copied - share it in your group chats!');
    };

    return (
        <div className="container section">
            <Link to="/" className="back-link">
                <span className="nudge nudge--left">←</span> All items
            </Link>

            <div className="detail">
                <div className="detail__media">
                    <ItemImage item={item} className="detail__image" />
                </div>

                <div className="detail__info stagger">
                    <div className="detail__badges">
                        <TypeBadge type={item.type} />
                        {resolved && (
                            <span className="badge badge--resolved" key={item.status}>
                                Reunited 🎉
                            </span>
                        )}
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
                                        <FeedbackButton onClick={() => copy(item.contact, 'Contact copied.')}>Copy</FeedbackButton>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="muted">
                                        🔒 To protect people's privacy, contact details are only shown to signed-in users.
                                    </p>
                                    <Link to="/login" state={{ from: location }} className="btn btn--primary btn--shine">
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
                                    <button
                                        className="btn btn--found btn--shine"
                                        disabled={busy}
                                        onClick={(e) => setStatus('resolved', e.currentTarget)}
                                    >
                                        {busy ? <span className="btn__spinner" aria-hidden="true" /> : '✅'} Mark as reunited
                                    </button>
                                )}
                                <Link className="btn btn--ghost" to={`/item/${item._id}/edit`}>
                                    Edit
                                </Link>
                                <button className="btn btn--danger-ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="row">
                        <FeedbackButton className="btn btn--ghost btn--sm" onClick={share} done="✓ Shared">
                            🔗 Share this post
                        </FeedbackButton>
                    </div>

                    {!resolved && <SafetyTips type={item.type} />}
                </div>
            </div>

            {!resolved && (
                <Reveal className="section" aria-labelledby="matches-heading">
                    <div className="section__head">
                        <h2 id="matches-heading">
                            {item.type === 'lost' ? 'Found items that might be this' : 'Lost reports that might match'}
                        </h2>
                    </div>
                    {matches === null ? (
                        <SkeletonGrid count={4} label="Looking for matches..." />
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
                </Reveal>
            )}

            <ConfirmDialog
                open={confirmDelete}
                icon="🗑️"
                title="Delete this post?"
                confirmLabel="Delete post"
                danger
                busy={busy}
                onConfirm={remove}
                onCancel={() => setConfirmDelete(false)}
            >
                <p>
                    "{item.name}" will be removed for everyone, along with its photo. If the item was returned, you can{' '}
                    <strong>mark it as reunited</strong> instead - it helps others see that TraceBack works.
                </p>
            </ConfirmDialog>
        </div>
    );
}
