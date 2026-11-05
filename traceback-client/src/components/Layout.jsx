import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <div className="app">
            <a href="#main" className="skip-link">
                Skip to content
            </a>
            <header className="nav">
                <div className="nav__inner container">
                    <Link to="/" className="brand" onClick={close} aria-label="TraceBack home">
                        <img src="/favicon.svg" alt="" width="32" height="32" />
                        <span>TraceBack</span>
                    </Link>
                    <button
                        className="nav__toggle"
                        aria-expanded={open}
                        aria-controls="nav-links"
                        onClick={() => setOpen((o) => !o)}
                    >
                        <span className="sr-only">Menu</span>☰
                    </button>
                    <nav id="nav-links" className={`nav__links ${open ? 'is-open' : ''}`} aria-label="Main">
                        <NavLink to="/" end onClick={close}>
                            Browse
                        </NavLink>
                        {user && (
                            <NavLink to="/my-posts" onClick={close}>
                                My posts
                            </NavLink>
                        )}
                        {user ? (
                            <button
                                className="link-button"
                                onClick={() => {
                                    logout();
                                    close();
                                    navigate('/');
                                }}
                            >
                                Log out
                            </button>
                        ) : (
                            <NavLink to="/login" state={{ from: location }} onClick={close}>
                                Log in
                            </NavLink>
                        )}
                        <Link to="/report" className="btn btn--primary btn--sm" onClick={close}>
                            + Report item
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="main" className="main">
                <Outlet />
            </main>

            <footer className="footer">
                <div className="container footer__inner">
                    <p>
                        <strong>TraceBack</strong> - helping lost things find their way home.
                    </p>
                    <p className="muted">
                        Stay safe: meet in public places, and never pay anyone to get your item back.
                    </p>
                </div>
            </footer>
        </div>
    );
}
