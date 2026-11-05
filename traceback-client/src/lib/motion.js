// Small motion helpers (see DESIGN.md). No animation libraries.
import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** Animate a number from 0 up to `target` (ease-out). Instant with reduced motion. */
export function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
    useEffect(() => {
        if (target == null) return undefined;
        if (prefersReducedMotion()) {
            setValue(target);
            return undefined;
        }
        let raf;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return value;
}

/** Returns [ref, visible] - visible becomes true once the element scrolls into view. */
export function useReveal() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
            setVisible(true);
            return undefined;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin: '0px 0px -8% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return [ref, visible];
}

/** True once the page has scrolled past `offset` pixels. */
export function useScrolled(offset = 8) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > offset);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [offset]);
    return scrolled;
}

/** Re-triggers a CSS animation class (e.g. a shake) each time `fire()` is called. */
export function useReplay(className, duration = 450) {
    const ref = useRef(null);
    const fire = () => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        el.classList.remove(className);
        void el.offsetWidth; // restart the animation
        el.classList.add(className);
        setTimeout(() => el.classList.remove(className), duration);
    };
    return [ref, fire];
}

export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
