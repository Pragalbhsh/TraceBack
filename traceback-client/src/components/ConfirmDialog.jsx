import { useEffect, useId, useRef } from 'react';

/** Accessible confirm modal (native <dialog>: focus trap + Esc built in). Replaces window.confirm. */
export default function ConfirmDialog({ open, icon, title, children, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
    const ref = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="dialog"
            aria-labelledby={titleId}
            onCancel={(e) => {
                e.preventDefault();
                onCancel();
            }}
            onClick={(e) => e.target === ref.current && onCancel()}
        >
            {open && (
                <div className="dialog__body">
                    {icon && (
                        <div className="dialog__icon" aria-hidden="true">
                            {icon}
                        </div>
                    )}
                    <h2 id={titleId}>{title}</h2>
                    <div className="muted">{children}</div>
                    <div className="row row--end">
                        <button type="button" className="btn btn--ghost" onClick={onCancel} autoFocus>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
                            onClick={onConfirm}
                            disabled={busy}
                        >
                            {busy && <span className="btn__spinner" aria-hidden="true" />}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            )}
        </dialog>
    );
}
