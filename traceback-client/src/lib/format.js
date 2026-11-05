const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "today", "yesterday", "3 days ago", "2 weeks ago"... */
export function timeAgo(date) {
    if (!date) return '';
    const days = Math.round((new Date(date) - new Date()) / 86400000);
    if (Math.abs(days) < 7) return rtf.format(days, 'day');
    if (Math.abs(days) < 60) return rtf.format(Math.round(days / 7), 'week');
    if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
    return rtf.format(Math.round(days / 365), 'year');
}

export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** yyyy-mm-dd for <input type="date"> in the user's local time */
export function toDateInput(date) {
    const d = date ? new Date(date) : new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

/** Turn an email or phone number into a clickable link, if it is one. */
export function contactHref(contact) {
    if (!contact) return null;
    const c = contact.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `mailto:${c}`;
    const digits = c.replace(/[^\d+]/g, '');
    if (/^\+?\d{7,15}$/.test(digits) && !/[a-z]/i.test(c)) return `tel:${digits}`;
    return null;
}
