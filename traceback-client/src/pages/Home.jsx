import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ItemCard from '../components/ItemCard';
import { Alert, EmptyState, Spinner } from '../components/ui';
import useTitle from '../lib/useTitle';

const TYPE_TABS = [
    { value: '', label: 'All' },
    { value: 'lost', label: 'Lost' },
    { value: 'found', label: 'Found' },
];

export default function Home() {
    useTitle();
    const [params, setParams] = useSearchParams();
    const type = params.get('type') || '';
    const category = params.get('category') || '';
    const q = params.get('q') || '';
    const status = params.get('status') || 'open';
    const page = Number(params.get('page')) || 1;

    const [search, setSearch] = useState(q);
    const [stats, setStats] = useState(null);
    const [state, setState] = useState({ loading: true, items: [], total: 0, pages: 1, error: '' });

    const update = (changes, { replace = false } = {}) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        if (!('page' in changes)) next.delete('page');
        setParams(next, { replace });
    };

    useEffect(() => {
        api('/stats').then(setStats).catch(() => {});
    }, []);

    // Keep the search box in sync when the URL changes (back button, links).
    useEffect(() => {
        setSearch(q);
    }, [q]);

    // Search as you type, but wait until typing pauses.
    useEffect(() => {
        if (search.trim() === q) return;
        const t = setTimeout(() => update({ q: search.trim() }, { replace: true }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const ctrl = new AbortController();
        setState((s) => ({ ...s, loading: true, error: '' }));
        api('/items', {
            query: { type, category, q, status: status === 'open' ? undefined : status, page, limit: 24 },
            signal: ctrl.signal,
            withMeta: true,
        })
            .then(({ data, total, pages }) => setState({ loading: false, items: data, total, pages, error: '' }))
            .catch((err) => err.name !== 'AbortError' && setState((s) => ({ ...s, loading: false, error: err.message })));
        return () => ctrl.abort();
    }, [type, category, q, status, page]);

    const filtersActive = type || category || q || status !== 'open';

    return (
        <>
            <section className="hero">
                <div className="container hero__inner">
                    <h1>
                        Lost something? Found something?
                        <br />
                        <span className="accent">Let's get it back home.</span>
                    </h1>
                    <p className="hero__lead">
                        Post what you lost or found. TraceBack automatically matches lost items with found ones and lets you
                        know when there's a likely match.
                    </p>
                    <div className="hero__actions">
                        <Link to="/report?type=lost" className="btn btn--lost btn--lg">
                            😟 I lost something
                        </Link>
                        <Link to="/report?type=found" className="btn btn--found btn--lg">
                            🙌 I found something
                        </Link>
                    </div>
                    {stats && (
                        <dl className="stats" aria-label="TraceBack in numbers">
                            <div>
                                <dt>Looking for owners</dt>
                                <dd>{stats.found}</dd>
                            </div>
                            <div>
                                <dt>Still missing</dt>
                                <dd>{stats.lost}</dd>
                            </div>
                            <div className="stats__good">
                                <dt>Reunited</dt>
                                <dd>{stats.reunited}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </section>

            <section className="container section" aria-labelledby="browse-heading">
                <div className="section__head">
                    <h2 id="browse-heading">Browse items</h2>
                    {!state.loading && (
                        <span className="muted" aria-live="polite">
                            {state.total} {state.total === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </div>

                <div className="filters" role="search">
                    <label className="search">
                        <span className="sr-only">Search items</span>
                        <span aria-hidden="true">🔍</span>
                        <input
                            type="search"
                            placeholder="Search: black wallet, AirPods, library..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                    <div className="tabs" role="group" aria-label="Lost or found">
                        {TYPE_TABS.map((t) => (
                            <button
                                key={t.value}
                                className={`tab ${type === t.value ? 'is-active' : ''}`}
                                aria-pressed={type === t.value}
                                onClick={() => update({ type: t.value })}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <label className="select">
                        <span className="sr-only">Category</span>
                        <select value={category} onChange={(e) => update({ category: e.target.value })}>
                            <option value="">All categories</option>
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.icon} {c.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="select">
                        <span className="sr-only">Status</span>
                        <select value={status} onChange={(e) => update({ status: e.target.value === 'open' ? '' : e.target.value })}>
                            <option value="open">Still open</option>
                            <option value="resolved">Reunited</option>
                            <option value="all">Everything</option>
                        </select>
                    </label>
                </div>

                <Alert>{state.error}</Alert>

                {state.loading ? (
                    <Spinner label="Loading items..." />
                ) : state.items.length === 0 && !state.error ? (
                    <EmptyState title={filtersActive ? 'Nothing matches those filters' : 'No items yet'}>
                        {filtersActive ? (
                            <button className="btn btn--ghost" onClick={() => setParams({})}>
                                Clear filters
                            </button>
                        ) : (
                            <p>
                                Be the first - <Link to="/report">report a lost or found item</Link>.
                            </p>
                        )}
                    </EmptyState>
                ) : (
                    <div className="grid">
                        {state.items.map((item) => (
                            <ItemCard key={item._id} item={item} />
                        ))}
                    </div>
                )}

                {state.pages > 1 && (
                    <nav className="pager" aria-label="Pages">
                        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                            ← Newer
                        </button>
                        <span className="muted">
                            Page {page} of {state.pages}
                        </span>
                        <button
                            className="btn btn--ghost"
                            disabled={page >= state.pages}
                            onClick={() => update({ page: page + 1 })}
                        >
                            Older →
                        </button>
                    </nav>
                )}
            </section>

            <section className="container section how">
                <h2>How it works</h2>
                <ol className="steps">
                    <li>
                        <strong>Post it</strong>
                        <span>Describe what you lost or found, where and when. A photo helps a lot.</span>
                    </li>
                    <li>
                        <strong>Get matched</strong>
                        <span>We compare it with every open post and show you the most likely matches - and email you about new ones.</span>
                    </li>
                    <li>
                        <strong>Reunite</strong>
                        <span>Contact each other, check it's really theirs, meet somewhere safe, then mark it as reunited.</span>
                    </li>
                </ol>
            </section>
        </>
    );
}
