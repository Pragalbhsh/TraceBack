// Confetti burst for the moments that matter: a match was found, an item was reunited.
import { prefersReducedMotion } from './motion';

const COLORS = ['#f0647b', '#2ec4b6', '#ffd166', '#7c7cf0', '#ff9f68', '#ffffff'];

/**
 * celebrate()                  - burst from the top-centre of the screen
 * celebrate({ from: element }) - burst from an element (e.g. the button that was clicked)
 */
export function celebrate({ from, count = 70 } = {}) {
    if (typeof document === 'undefined' || prefersReducedMotion()) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.3;
    if (from?.getBoundingClientRect) {
        const r = from.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
    }

    const root = document.createElement('div');
    root.className = 'confetti';
    root.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('i');
        const angle = Math.random() * Math.PI * 2;
        const distance = 90 + Math.random() * 240;
        piece.style.left = `${x}px`;
        piece.style.top = `${y}px`;
        piece.style.background = COLORS[i % COLORS.length];
        piece.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        piece.style.setProperty('--y', `${Math.sin(angle) * distance * 0.7 - 140}px`);
        piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
        piece.style.setProperty('--d', `${Math.random() * 120}ms`);
        root.appendChild(piece);
    }
    document.body.appendChild(root);
    setTimeout(() => root.remove(), 1900);
}
