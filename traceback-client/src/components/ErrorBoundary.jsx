import { Component } from 'react';

/** Shows a friendly message instead of a blank page if something crashes. */
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('TraceBack crashed:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="container section">
                <div className="empty">
                    <div className="empty__icon" aria-hidden="true">
                        😵
                    </div>
                    <h3>Something went wrong on this page</h3>
                    <p className="muted">Please reload. If it keeps happening, let us know what you were doing.</p>
                    <button className="btn btn--primary" onClick={() => window.location.reload()}>
                        Reload
                    </button>
                </div>
            </div>
        );
    }
}
