import { useLayoutEffect, useRef, useState } from 'react';

/** Toggle buttons with a pill that slides to the selected option. */
export default function Segmented({ options, value, onChange, label }) {
    const wrap = useRef(null);
    const [pill, setPill] = useState(null);

    useLayoutEffect(() => {
        const measure = () => {
            const active = wrap.current?.querySelector('[aria-pressed="true"]');
            if (active) setPill({ x: active.offsetLeft, w: active.offsetWidth });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [value, options]);

    return (
        <div className={`tabs ${pill ? '' : 'tabs--no-pill'}`} role="group" aria-label={label} ref={wrap}>
            {pill && (
                <span
                    className={`tabs__pill ${value ? `tabs__pill--${value}` : ''}`}
                    style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
                    aria-hidden="true"
                />
            )}
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    className={`tab ${value === o.value ? 'is-active' : ''}`}
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
