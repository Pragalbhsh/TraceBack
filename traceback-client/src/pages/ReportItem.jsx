import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, ApiError, imageUrl } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { toDateInput } from '../lib/format';
import { celebrate } from '../lib/celebrate';
import { scrollBehavior, useReplay } from '../lib/motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, CheckDraw, EmptyState, MatchGrid, Spinner } from '../components/ui';
import useTitle from '../lib/useTitle';

const MAX_MB = 5;
const FIELD_ORDER = ['name', 'category', 'description', 'location', 'date', 'contact', 'image'];

function Field({ label, hint, error, children, id }) {
    return (
        <div className={`field ${error ? 'has-error' : ''}`}>
            <label htmlFor={id}>{label}</label>
            {children}
            {error ? (
                <p className="field__error" id={`${id}-error`}>
                    {error}
                </p>
            ) : (
                hint && (
                    // Keyed so the hint cross-fades when it changes (e.g. lost -> found).
                    <p className="field__hint swap" key={hint}>
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

/** Fills up as useful details are added, and says what to add next. */
function PostStrength({ checks }) {
    const done = checks.filter((c) => c.done).length;
    const level = done <= 2 ? 1 : done <= 4 ? 2 : done === 5 ? 3 : 4;
    const label = ['', 'Just started', 'Good start', 'Great', 'Excellent'][level];
    const next = checks.find((c) => !c.done);
    return (
        <div className="strength-meter" aria-live="polite">
            <div className="strength-meter__top">
                <strong>Post strength: {label}</strong>
                <span className="muted">
                    {done}/{checks.length}
                </span>
            </div>
            <div className="strength-meter__bar">
                <div
                    className={`strength-meter__fill strength-meter__fill--${level}`}
                    style={{ transform: `scaleX(${Math.max(0.04, done / checks.length)})` }}
                />
            </div>
            <p className="strength-meter__tip swap" key={next?.tip || 'done'}>
                {next ? `Next: ${next.tip}` : '🎯 Perfect - this post gives matching everything it needs.'}
            </p>
        </div>
    );
}

export default function ReportItem() {
    const { id } = useParams(); // present when editing
    const editing = Boolean(id);
    const [params] = useSearchParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const fileInput = useRef(null);
    const [formRef, shake] = useReplay('is-shaking');
    useTitle(editing ? 'Edit post' : 'Report an item');

    const [form, setForm] = useState({
        type: params.get('type') === 'found' ? 'found' : 'lost',
        name: '',
        category: '',
        description: '',
        location: '',
        date: toDateInput(),
        contact: user?.email || '',
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(editing);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!editing) return;
        api(`/items/${id}`)
            .then((item) => {
                if (!item.isOwner) {
                    navigate(`/item/${id}`, { replace: true });
                    return;
                }
                setForm({
                    type: item.type,
                    name: item.name,
                    category: item.category === 'other' ? '' : item.category,
                    description: item.description || '',
                    location: item.location,
                    date: toDateInput(item.date),
                    contact: item.contact || '',
                });
                setExistingImage(item.image);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [editing, id, navigate]);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return undefined;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
        setError(''); // the summary message is stale as soon as they start fixing things
    };

    const pickFile = (f, input) => {
        if (!f) return;
        const reject = (message) => {
            setErrors((er) => ({ ...er, image: message }));
            if (input) input.value = '';
        };
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return reject('Please choose a JPG, PNG or WebP photo.');
        if (f.size > MAX_MB * 1024 * 1024) return reject(`That photo is too large (max ${MAX_MB} MB).`);
        setErrors((er) => ({ ...er, image: undefined }));
        setFile(f);
        setRemoveImage(false);
    };

    const clearFile = () => {
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
    };

    const showErrors = (fieldErrors, message) => {
        setErrors(fieldErrors);
        setError(message);
        shake();
        const first = FIELD_ORDER.find((f) => fieldErrors[f]);
        if (first) document.getElementById(first)?.focus({ preventScroll: false });
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');

        // Quick checks first, so people don't wait for the server to hear about an empty field.
        const missing = {};
        if (form.name.trim().length < 2) missing.name = 'Give the item a short name (at least 2 characters)';
        if (form.location.trim().length < 2) missing.location = 'Where was it lost or found?';
        if (form.contact.trim().length < 3) missing.contact = 'Add a way for people to reach you';
        if (Object.keys(missing).length) return showErrors(missing, Object.values(missing)[0]);

        setErrors({});
        setSubmitting(true);
        const body = new FormData();
        const values = {
            ...form,
            category: form.category || 'other',
            // Noon local time, so the day doesn't shift when converted to UTC.
            date: form.date ? new Date(`${form.date}T12:00:00`).toISOString() : '',
        };
        Object.entries(values).forEach(([k, v]) => body.append(k, v));
        if (file) body.append('image', file);
        if (editing && removeImage && !file) body.append('removeImage', 'true');

        try {
            if (editing) {
                await api(`/items/${id}`, { method: 'PUT', body });
                toast('Changes saved.', { kind: 'success' });
                navigate(`/item/${id}`);
            } else {
                setResult(await api('/items', { method: 'POST', body }));
                window.scrollTo({ top: 0, behavior: scrollBehavior() });
            }
        } catch (err) {
            showErrors(err instanceof ApiError ? err.fieldErrors : {}, err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Spinner />;
    if (result) return <Submitted result={result} />;

    const lost = form.type === 'lost';
    const shownImage = preview || (!removeImage && existingImage ? imageUrl(existingImage) : null);
    const checks = [
        { done: form.name.trim().length >= 2, tip: 'give it a short name.' },
        { done: Boolean(form.category), tip: 'pick a category - it is the strongest matching signal.' },
        { done: form.description.trim().length >= 20, tip: 'describe the colour, brand or any marks - details make matches.' },
        { done: form.location.trim().length >= 2, tip: 'say where it happened.' },
        { done: form.contact.trim().length >= 3, tip: 'add how people can reach you.' },
        { done: Boolean(shownImage), tip: 'add a photo - posts with photos get recognised much faster.' },
    ];

    return (
        <div className="container section narrow">
            <h1 className="rise">{editing ? 'Edit your post' : 'Report an item'}</h1>
            {!editing && (
                <p className="muted rise" style={{ '--i': 1 }}>
                    The more detail you give, the better the matching works. It takes about a minute.
                </p>
            )}

            {/* Entrance lives on the wrapper so the shake animation on the form doesn't replay it. */}
            <div className="rise" style={{ '--i': 2 }}>
            <form ref={formRef} className="form card" onSubmit={submit} noValidate>
                <fieldset className="type-picker">
                    <legend>What happened?</legend>
                    {[
                        { value: 'lost', icon: '😟', title: 'I lost something', text: "Tell finders what you're looking for" },
                        { value: 'found', icon: '🙌', title: 'I found something', text: 'Help it get back to its owner' },
                    ].map((o) => (
                        <label key={o.value} className={`type-option type-option--${o.value} ${form.type === o.value ? 'is-active' : ''}`}>
                            <input type="radio" name="type" value={o.value} checked={form.type === o.value} onChange={set('type')} />
                            <span className="type-option__icon" aria-hidden="true">
                                {o.icon}
                            </span>
                            <span>
                                <strong>{o.title}</strong>
                                <small>{o.text}</small>
                            </span>
                            {form.type === o.value && (
                                <span className="type-option__check" aria-hidden="true">
                                    ✓
                                </span>
                            )}
                        </label>
                    ))}
                </fieldset>

                <PostStrength checks={checks} />

                <Field id="name" label="What is it? *" error={errors.name} hint="A short name, e.g. “Blue Nike backpack” or “iPhone 13”">
                    <input
                        id="name"
                        value={form.name}
                        onChange={set('name')}
                        maxLength={100}
                        required
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                </Field>

                <Field id="category" label="Category" error={errors.category}>
                    <select id="category" value={form.category} onChange={set('category')}>
                        <option value="">Choose a category...</option>
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.icon} {c.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field
                    id="description"
                    label="Description"
                    error={errors.description}
                    hint={
                        lost
                            ? 'Colour, brand, size, stickers, scratches, what was inside... Details are what make a match.'
                            : 'Describe it, but keep one detail to yourself (e.g. what’s inside) so you can check the real owner.'
                    }
                >
                    <textarea id="description" rows={4} value={form.description} onChange={set('description')} maxLength={1000} />
                </Field>

                <div className="field-row">
                    <Field
                        id="location"
                        label={lost ? 'Where did you lose it? *' : 'Where did you find it? *'}
                        error={errors.location}
                        hint="Be specific: “Main library, 2nd floor” or “Bus 21 near City Mall”"
                    >
                        <input
                            id="location"
                            value={form.location}
                            onChange={set('location')}
                            maxLength={150}
                            required
                            aria-invalid={Boolean(errors.location)}
                            aria-describedby={errors.location ? 'location-error' : undefined}
                        />
                    </Field>
                    <Field id="date" label={lost ? 'When did you lose it?' : 'When did you find it?'} error={errors.date}>
                        <input id="date" type="date" value={form.date} max={toDateInput()} onChange={set('date')} />
                    </Field>
                </div>

                <Field
                    id="contact"
                    label="How can people reach you? *"
                    error={errors.contact}
                    hint="Email, phone or WhatsApp. Only shown to signed-in users."
                >
                    <input
                        id="contact"
                        value={form.contact}
                        onChange={set('contact')}
                        maxLength={150}
                        required
                        aria-invalid={Boolean(errors.contact)}
                        aria-describedby={errors.contact ? 'contact-error' : undefined}
                    />
                </Field>

                <Field id="image" label="Photo (optional)" error={errors.image}>
                    {shownImage ? (
                        <div className="upload-preview">
                            <img src={shownImage} alt="Selected photo preview" />
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => (file ? clearFile() : setRemoveImage(true))}
                            >
                                Remove photo
                            </button>
                        </div>
                    ) : (
                        <div
                            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragging(false);
                                pickFile(e.dataTransfer.files?.[0]);
                            }}
                        >
                            <input
                                id="image"
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => pickFile(e.target.files?.[0], e.target)}
                            />
                            <span className="dropzone__icon" aria-hidden="true">
                                📷
                            </span>
                            <strong>{dragging ? 'Drop it here' : 'Add a photo'}</strong>
                            <span className="muted small">Drag it here or tap to choose · JPG, PNG or WebP up to {MAX_MB} MB</span>
                        </div>
                    )}
                </Field>

                <Alert>{error}</Alert>

                <div className="row row--end">
                    <Link to={editing ? `/item/${id}` : '/'} className="btn btn--ghost">
                        Cancel
                    </Link>
                    <button className={`btn btn--${lost ? 'lost' : 'found'} btn--shine`} disabled={submitting}>
                        {submitting && <span className="btn__spinner" aria-hidden="true" />}
                        {submitting ? 'Saving...' : editing ? 'Save changes' : lost ? 'Post lost item' : 'Post found item'}
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
}

function Submitted({ result }) {
    const { savedItem, possibleMatches } = result;
    const lost = savedItem.type === 'lost';
    const found = possibleMatches.length;

    // A match is one of the two moments worth celebrating (DESIGN.md).
    useEffect(() => {
        if (!found) return undefined;
        const t = setTimeout(() => celebrate(), 500);
        return () => clearTimeout(t);
    }, [found]);

    return (
        <div className="container section">
            <div className="success card">
                <CheckDraw />
                <h1 className="rise" style={{ '--i': 2 }}>
                    Your post is live!
                </h1>
                <p className="rise" style={{ '--i': 3 }}>
                    {found
                        ? `Good news - we found ${found} possible ${found === 1 ? 'match' : 'matches'}. Have a look below.`
                        : lost
                          ? "No matches yet, but don't lose hope - many items are handed in a day or two later. We'll email you when a likely match is posted."
                          : "No one has reported this missing yet. We'll email you when someone posts a lost item that looks like it."}
                </p>
                <div className="row row--center rise" style={{ '--i': 4 }}>
                    <Link className="btn btn--primary" to={`/item/${savedItem._id}`}>
                        View your post
                    </Link>
                    <Link className="btn btn--ghost" to="/my-posts">
                        My posts
                    </Link>
                </div>
                <p className="muted small rise" style={{ '--i': 5 }}>
                    Tip: share your post in local WhatsApp / campus groups to reach more people.
                </p>
            </div>

            {found > 0 ? (
                <section className="section">
                    <h2 className="rise" style={{ '--i': 5 }}>
                        {lost ? 'Found items that might be yours' : 'People who might be looking for this'}
                    </h2>
                    <MatchGrid matches={possibleMatches} />
                </section>
            ) : (
                <EmptyState icon="📬" title="We'll keep looking">
                    <p>Every new post is checked against yours automatically.</p>
                </EmptyState>
            )}
        </div>
    );
}
