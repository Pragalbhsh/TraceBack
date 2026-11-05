import { Link } from 'react-router';
import { EmptyState } from '../components/ui';
import useTitle from '../lib/useTitle';

export default function NotFound() {
    useTitle('Page not found');
    return (
        <div className="container section">
            <EmptyState icon="🧭" title="This page got lost too">
                <p>We couldn't find that page.</p>
                <Link to="/" className="btn btn--primary">
                    Go to TraceBack home
                </Link>
            </EmptyState>
        </div>
    );
}
