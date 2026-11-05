import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { useCountUp } from '../lib/motion';
import ItemCard from '../components/ItemCard';
import Segmented from '../components/Segmented';
import { Alert, EmptyState, Reveal, SkeletonGrid } from '../components/ui';
import useTitle from '../lib/useTitle';

const TYPE_TABS = [
    { value: '', label: 'All' },
    { value: 'lost', label: 'Lost' },
    { value: 'found', label: 'Found' },
];

function Stat({ label, value, good }) {
    const n = useCountUp(value);
    return (
        <div className={good ? 'stats__good' : undefined}>
            <dt>{label}</dt>
            <dd aria-label={String(value)}>{n}</dd>
        </div>
    );
}

export default function Home() {
    useTitle();
    const [params, setParams] = useSearchParams();
    const type = params.get('type') || '';
    const category = params.get('category') || '';
    const q = params.get('q') || '';
    const status = params.get('status') || 'open';
    const page = Number(params.get('page')) || 1;
    const queryKey = `${type}|${category}|${q}|${status}|${page}`;

    const [search, setSearch] = useState(q);
    const [stats, setStats] = useState(null);
    // `initial` shows skeletons the first time; after that old results stay (dimmed) while new ones load.
    const [state, setState] = useState({ initial: true, refreshing: true, items: [], total: 0, pages: 1, error: '', key: '' });

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
        if (search.trim() === q) return undefined;
        const t = setTimeout(() => update({ q: search.trim() }, { replace: true }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const ctrl = new AbortController();
        setState((s) => ({ ...s, refreshing: true, error: '' }));
        api('/items', {
            query: { type, category, q, status: status === 'open' ? undefined : status, page, limit: 24 },
            signal: ctrl.signal,
            withMeta: true,
        })
            .then(({ data, total, pages }) =>
                setState({ initial: false, refreshing: false, items: data, total, pages, error: '', key: queryKey })
            )
            .catch(
                (err) =>
                    err.name !== 'AbortError' &&
                    setState((s) => ({ ...s, initial: false, refreshing: false, error: err.message }))
            );
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKey]);

    const filtersActive = type || category || q || status !== 'open';

    return (
        <>
            <section className="hero">
                <div className="hero__blob hero__blob--a" aria-hidden="true" />
                <div className="hero__blob hero__blob--b" aria-hidden="true" />
                <div className="container hero__inner">
                    <h1 className="hero__title">
                        <span className="rise" style={{ '--i': 0 }}>
                            Lost something? Found something?
                        </span>
                        <span className="rise accent" style={{ '--i': 1 }}>
                            Let's get it back home.
                        </span>
                    </h1>
                    <p className="hero__lead rise" style={{ '--i': 2 }}>
                        Post what you lost or found. TraceBack automatically matches lost items with found ones and lets you
                        know when there's a likely match.
                    </p>
                    <div className="hero__actions rise" style={{ '--i': 3 }}>
                        <Link to="/report?type=lost" className="btn btn--lost btn--lg btn--shine">
                            😟 I lost something
                        </Link>
                        <Link to="/report?type=found" className="btn btn--found btn--lg btn--shine">
                            🙌 I found something
                        </Link>
                    </div>
                    {stats && (
                        <dl className="stats rise" style={{ '--i': 4 }} aria-label="TraceBack in numbers">
                            <Stat label="Looking for owners" value={stats.found} />
                            <Stat label="Still missing" value={stats.lost} />
                            <Stat label="Reunited" value={stats.reunited} good />
                        </dl>
                    )}
                </div>
            </section>

            <section className="container section" aria-labelledby="browse-heading">
                <div className="section__head">
                    <h2 id="browse-heading">Browse items</h2>
                    {!state.initial && (
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
                        {search && (
                            <button type="button" className="search__clear" aria-label="Clear search" onClick={() => setSearch('')}>
                                ×
                            </button>
                        )}
                    </label>
                    <Segmented label="Lost or found" options={TYPE_TABS} value={type} onChange={(v) => update({ type: v })} />
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

                <div className={`results ${state.refreshing && !state.initial ? 'is-refreshing' : ''}`} aria-busy={state.refreshing}>
                    {state.refreshing && !state.initial && <div className="loading-bar" aria-hidden="true" />}
                    {state.initial ? (
                        <SkeletonGrid />
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
                        // Keyed by the query so every new result set staggers in.
                        <div className="grid" key={state.key}>
                            {state.items.map((item, i) => (
                                <ItemCard key={item._id} item={item} index={i} />
                            ))}
                        </div>
                    )}
                </div>

                {state.pages > 1 && (
                    <nav className="pager" aria-label="Pages">
                        <button
                            className="btn btn--ghost btn--icon-nudge"
                            disabled={page <= 1}
                            onClick={() => update({ page: page - 1 })}
                        >
                            <span className="nudge nudge--left">←</span> Newer
                        </button>
                        <span className="muted">
                            Page {page} of {state.pages}
                        </span>
                        <button
                            className="btn btn--ghost btn--icon-nudge"
                            disabled={page >= state.pages}
                            onClick={() => update({ page: page + 1 })}
                        >
                            Older <span className="nudge nudge--right">→</span>
                        </button>
                    </nav>
                )}
            </section>

            <Reveal className="container section how">
                <h2>How it works</h2>
                <ol className="steps">
                    {[
                        ['Post it', 'Describe what you lost or found, where and when. A photo helps a lot.'],
                        [
                            'Get matched',
                            'We compare it with every open post and show you the most likely matches - and email you about new ones.',
                        ],
                        ['Reunite', "Contact each other, check it's really theirs, meet somewhere safe, then mark it as reunited."],
                    ].map(([title, text], i) => (
                        <li key={title} className="reveal-item" style={{ '--i': i }}>
                            <strong>{title}</strong>
                            <span>{text}</span>
                        </li>
                    ))}
                </ol>
            </Reveal>
        </>
    );
}
