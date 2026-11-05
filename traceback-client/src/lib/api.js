// Small wrapper around fetch for talking to the TraceBack backend.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const TOKEN_KEY = 'traceback_token';

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.status = status;
        this.details = details || [];
    }
    /** { fieldName: message } for showing errors next to form inputs */
    get fieldErrors() {
        return Object.fromEntries(this.details.filter((d) => d.field).map((d) => [d.field, d.message]));
    }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export async function api(path, { method = 'GET', body, query, signal, withMeta = false } = {}) {
    const url = new URL(API_URL + path);
    Object.entries(query || {}).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && url.searchParams.set(k, v));

    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    let res;
    try {
        res = await fetch(url, { method, headers, body: body && !isForm ? JSON.stringify(body) : body, signal });
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new ApiError("Can't reach the TraceBack server. Check your connection and try again.", 0);
    }

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
        if (res.status === 401 && token) onUnauthorized();
        throw new ApiError((data && data.error) || `Something went wrong (${res.status})`, res.status, data && data.details);
    }
    if (withMeta) {
        return {
            data,
            total: Number(res.headers.get('X-Total-Count')) || 0,
            pages: Number(res.headers.get('X-Total-Pages')) || 1,
        };
    }
    return data;
}

/** Images stored on the backend come back as "/uploads/..."; Cloudinary ones are full URLs. */
export function imageUrl(src) {
    if (!src) return null;
    return src.startsWith('/') ? API_URL + src : src;
}
