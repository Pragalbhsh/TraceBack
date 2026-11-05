import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, ApiError, imageUrl } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { toDateInput } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Alert, EmptyState, MatchGrid, Spinner } from '../components/ui';
import useTitle from '../lib/useTitle';

const MAX_MB = 5;

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
                hint && <p className="field__hint">{hint}</p>
            )}
        </div>
    );
}

export default function ReportItem() {
    const { id } = useParams(); // present when editing
    const editing = Boolean(id);
    const [params] = useSearchParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInput = useRef(null);
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
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
    };

    const pickFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            setErrors((er) => ({ ...er, image: 'Please choose a JPG, PNG or WebP photo.' }));
            e.target.value = '';
            return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            setErrors((er) => ({ ...er, image: `That photo is too large (max ${MAX_MB} MB).` }));
            e.target.value = '';
            return;
        }
        setErrors((er) => ({ ...er, image: undefined }));
        setFile(f);
        setRemoveImage(false);
    };

    const clearFile = () => {
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
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
                navigate(`/item/${id}`);
            } else {
                setResult(await api('/items', { method: 'POST', body }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Spinner />;
    if (result) return <Submitted result={result} />;

    const lost = form.type === 'lost';
    const shownImage = preview || (!removeImage && existingImage ? imageUrl(existingImage) : null);

    return (
        <div className="container section narrow">
            <h1>{editing ? 'Edit your post' : 'Report an item'}</h1>
            {!editing && (
                <p className="muted">
                    The more detail you give, the better the matching works. It takes about a minute.
                </p>
            )}

            <form className="form card" onSubmit={submit} noValidate>
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
                        </label>
                    ))}
                </fieldset>

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
                    />
                </Field>

                <Field id="image" label="Photo (optional)" error={errors.image} hint={`JPG, PNG or WebP, up to ${MAX_MB} MB`}>
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
                        <input
                            id="image"
                            ref={fileInput}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={pickFile}
                        />
                    )}
                </Field>

                <Alert>{error}</Alert>

                <div className="row row--end">
                    <Link to={editing ? `/item/${id}` : '/'} className="btn btn--ghost">
                        Cancel
                    </Link>
                    <button className={`btn btn--${lost ? 'lost' : 'found'}`} disabled={submitting}>
                        {submitting ? 'Saving...' : editing ? 'Save changes' : lost ? 'Post lost item' : 'Post found item'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Submitted({ result }) {
    const { savedItem, possibleMatches } = result;
    const lost = savedItem.type === 'lost';
    return (
        <div className="container section">
            <div className="success card">
                <div className="success__icon" aria-hidden="true">
                    ✅
                </div>
                <h1>Your post is live!</h1>
                <p>
                    {possibleMatches.length
                        ? `Good news - we found ${possibleMatches.length} possible ${possibleMatches.length === 1 ? 'match' : 'matches'}. Have a look below.`
                        : lost
                          ? "No matches yet, but don't lose hope - many items are handed in a day or two later. We'll email you when a likely match is posted."
                          : "No one has reported this missing yet. We'll email you when someone posts a lost item that looks like it."}
                </p>
                <div className="row row--center">
                    <Link className="btn btn--primary" to={`/item/${savedItem._id}`}>
                        View your post
                    </Link>
                    <Link className="btn btn--ghost" to="/my-posts">
                        My posts
                    </Link>
                </div>
                <p className="muted small">Tip: share your post in local WhatsApp / campus groups to reach more people.</p>
            </div>

            {possibleMatches.length > 0 ? (
                <section className="section">
                    <h2>{lost ? 'Found items that might be yours' : 'People who might be looking for this'}</h2>
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
