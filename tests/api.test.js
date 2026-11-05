// HTTP behaviour that doesn't need a database: auth guards, validation, errors, security headers.
const request = require('supertest');
const app = require('../app');

const ORIGIN = 'http://localhost:5173';
const someId = '64b7f9f9f9f9f9f9f9f9f9f9';

describe('basics', () => {
    it('responds on /', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Traceback backend running/);
    });

    it('reports database status on /health', async () => {
        const res = await request(app).get('/health');
        expect(res.body.db).toBe('disconnected');
        expect(res.status).toBe(503);
    });

    it('serves categories on /meta', async () => {
        const res = await request(app).get('/meta');
        expect(res.body.categories.map((c) => c.value)).toContain('phone');
    });

    it('returns JSON 404s for unknown routes', async () => {
        const res = await request(app).get('/nope');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Not found/);
    });

    it('rejects malformed JSON with 400', async () => {
        const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{oops');
        expect(res.status).toBe(400);
    });
});

describe('security', () => {
    it('allows the configured frontend origin', async () => {
        const res = await request(app).get('/').set('Origin', ORIGIN);
        expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    });

    it('does not allow unknown origins', async () => {
        const res = await request(app).get('/').set('Origin', 'https://evil.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('exposes pagination headers to the browser', async () => {
        const res = await request(app).options('/items').set('Origin', ORIGIN).set('Access-Control-Request-Method', 'GET');
        expect(res.status).toBe(204);
        const res2 = await request(app).get('/').set('Origin', ORIGIN);
        expect(res2.headers['access-control-expose-headers']).toMatch(/X-Total-Count/);
    });

    it('sets helmet security headers', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});

describe('auth guards', () => {
    it.each([
        ['post', '/items'],
        ['put', `/items/${someId}`],
        ['patch', `/items/${someId}`],
        ['delete', `/items/${someId}`],
        ['get', '/items/mine'],
        ['get', '/auth/me'],
    ])('%s %s requires login', async (method, url) => {
        const res = await request(app)[method](url);
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/log in/i);
    });

    it('rejects an invalid token with a clear message', async () => {
        const res = await request(app).get('/auth/me').set('Authorization', 'Bearer not-a-token');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/expired/);
    });
});

describe('input checks', () => {
    it('returns 400 (not 500) for invalid item ids', async () => {
        for (const id of ['abc', '123456789012', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
            const res = await request(app).get(`/items/${id}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Invalid item id');
        }
    });

    it('validates list filters', async () => {
        const res = await request(app).get('/items?type=stolen');
        expect(res.status).toBe(400);
    });

    it('validates registration with field-level details', async () => {
        const res = await request(app).post('/auth/register').send({ name: 'A', email: 'bad', password: '123' });
        expect(res.status).toBe(400);
        expect(res.body.details.map((d) => d.field)).toEqual(['name', 'email', 'password']);
    });

    it('validates login', async () => {
        const res = await request(app).post('/auth/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Enter your email');
    });
});
