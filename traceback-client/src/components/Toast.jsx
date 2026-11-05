import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

/** Short confirmations that slide up from the bottom ("Link copied", "Marked as reunited"). */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 220);
    }, []);

    const toast = useCallback(
        (message, { kind = 'info', duration = 3500 } = {}) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setToasts((list) => [...list.slice(-2), { id, message, kind }]);
            timers.current[id] = setTimeout(() => dismiss(id), duration);
            return id;
        },
        [dismiss]
    );

    const value = useMemo(() => toast, [toast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toasts" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast--${t.kind} ${t.leaving ? 'is-leaving' : ''}`}>
                        <span>{t.message}</span>
                        <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
