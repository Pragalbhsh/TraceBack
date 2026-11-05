import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useScrolled } from '../lib/motion';
import { useToast } from './Toast';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const scrolled = useScrolled();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    // Close the mobile menu whenever the page changes.
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    return (
        <div className="app">
            <a href="#main" className="skip-link">
                Skip to content
            </a>
            <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
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
                        <span className="sr-only">Menu</span>
                        <span className="burger" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
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
                                    toast('You have been logged out. See you soon!');
                                }}
                            >
                                Log out
                            </button>
                        ) : (
                            <NavLink to="/login" state={{ from: location }} onClick={close}>
                                Log in
                            </NavLink>
                        )}
                        <Link to="/report" className="btn btn--primary btn--sm btn--shine" onClick={close}>
                            + Report item
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="main" className="main">
                {/* Keyed by path so each page fades in; filter changes (query string) don't re-animate. */}
                <div className="page" key={location.pathname}>
                    <Outlet />
                </div>
            </main>

            <footer className="footer">
                <div className="container footer__inner">
                    <p>
                        <strong>TraceBack</strong> - helping lost things find their way home.
                    </p>
                    <p className="muted">Stay safe: meet in public places, and never pay anyone to get your item back.</p>
                </div>
            </footer>
        </div>
    );
}
