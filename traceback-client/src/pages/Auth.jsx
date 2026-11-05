import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Alert } from '../components/ui';
import useTitle from '../lib/useTitle';

function useRedirectBack() {
    const location = useLocation();
    const navigate = useNavigate();
    const from = location.state?.from;
    const to = from ? `${from.pathname}${from.search || ''}` : '/';
    return { from, go: () => navigate(to, { replace: true }), state: location.state };
}

function Reason({ from }) {
    if (from?.pathname === '/report') {
        return (
            <Alert kind="info">
                Please log in to post. Having an account means only you can edit your post, and we can email you when a
                match turns up.
            </Alert>
        );
    }
    if (from?.pathname?.startsWith('/item/')) {
        return <Alert kind="info">Log in to see contact details. This keeps people's phone numbers away from spam bots.</Alert>;
    }
    return null;
}

export function Login() {
    useTitle('Log in');
    const { login } = useAuth();
    const { from, go, state } = useRedirectBack();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login(email, password);
            go();
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="container section auth">
            <form className="card form" onSubmit={submit}>
                <h1>Welcome back</h1>
                <Reason from={from} />
                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <Alert>{error}</Alert>
                <button className="btn btn--primary btn--block" disabled={busy}>
                    {busy ? 'Logging in...' : 'Log in'}
                </button>
                <p className="muted center">
                    New here?{' '}
                    <Link to="/register" state={state}>
                        Create a free account
                    </Link>
                </p>
            </form>
        </div>
    );
}

export function Register() {
    useTitle('Create account');
    const { register } = useAuth();
    const { from, go, state } = useRedirectBack();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        setErrors({});
        try {
            await register(form.name, form.email, form.password);
            go();
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.fieldErrors);
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <div className="container section auth">
            <form className="card form" onSubmit={submit} noValidate>
                <h1>Create your account</h1>
                <Reason from={from} />
                <div className={`field ${errors.name ? 'has-error' : ''}`}>
                    <label htmlFor="name">Your name</label>
                    <input id="name" autoComplete="name" value={form.name} onChange={set('name')} required />
                    {errors.name && <p className="field__error">{errors.name}</p>}
                </div>
                <div className={`field ${errors.email ? 'has-error' : ''}`}>
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
                    {errors.email ? (
                        <p className="field__error">{errors.email}</p>
                    ) : (
                        <p className="field__hint">We'll email you when a possible match is posted. No spam.</p>
                    )}
                </div>
                <div className={`field ${errors.password ? 'has-error' : ''}`}>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={form.password}
                        onChange={set('password')}
                        required
                    />
                    {errors.password ? (
                        <p className="field__error">{errors.password}</p>
                    ) : (
                        <p className="field__hint">At least 8 characters.</p>
                    )}
                </div>
                <Alert>{Object.keys(errors).length ? '' : error}</Alert>
                <button className="btn btn--primary btn--block" disabled={busy}>
                    {busy ? 'Creating account...' : 'Create account'}
                </button>
                <p className="muted center">
                    Already have an account?{' '}
                    <Link to="/login" state={state}>
                        Log in
                    </Link>
                </p>
            </form>
        </div>
    );
}
