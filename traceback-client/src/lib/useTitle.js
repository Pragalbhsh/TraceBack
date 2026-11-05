import { useEffect } from 'react';

export default function useTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} · TraceBack` : 'TraceBack - Lost & Found';
    }, [title]);
}
