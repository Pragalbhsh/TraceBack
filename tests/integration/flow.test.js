// End-to-end API flow against a real MongoDB.
// Run with: npm run test:integration   (or set MONGO_URI_TEST to a database whose name contains "test")
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'traceback-uploads-'));

const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');

const enabled = process.env.RUN_INTEGRATION || process.env.MONGO_URI_TEST;
const suite = enabled ? describe : describe.skip;

// 1x1 transparent PNG
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
);

const register = async (name, email) => {
    const res = await request(app).post('/auth/register').send({ name, email, password: 'password123' });
    expect(res.status).toBe(201);
    return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
};

suite('TraceBack API flow', () => {
    let asha;
    let ben;
    let lostId;
    let foundId;

    beforeAll(async () => {
        await db.connect();
        asha = await register('Asha Rao', 'asha@example.com');
        ben = await register('Ben Thomas', 'ben@example.com');
    });

    afterAll(async () => {
        await db.disconnect();
        fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
    });

    describe('accounts', () => {
        it('rejects a duplicate email', async () => {
            const res = await request(app).post('/auth/register').send({ name: 'Asha', email: 'ASHA@example.com', password: 'password123' });
            expect(res.status).toBe(409);
        });

        it('logs in with the right password only', async () => {
            const ok = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'password123' });
            expect(ok.status).toBe(200);
            expect(ok.body.token).toBeTruthy();
            expect(ok.body.user.passwordHash).toBeUndefined();

            const bad = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'wrong-password' });
            expect(bad.status).toBe(401);
            const unknown = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'whatever1' });
            expect(unknown.status).toBe(401);
            expect(unknown.body.error).toBe(bad.body.error); // doesn't reveal which emails exist
        });

        it('returns and updates the current user', async () => {
            const me = await request(app).get('/auth/me').set(asha.auth);
            expect(me.body.user.email).toBe('asha@example.com');
            const upd = await request(app).patch('/auth/me').set(asha.auth).send({ emailAlerts: false });
            expect(upd.body.user.emailAlerts).toBe(false);
            await request(app).patch('/auth/me').set(asha.auth).send({ emailAlerts: true });
        });
    });

    describe('posting and matching', () => {
        it('posts a lost item with a photo (multipart) and ignores fields clients must not set', async () => {
            const res = await request(app)
                .post('/items')
                .set(asha.auth)
                .field('type', 'lost')
                .field('name', 'iPhone 13')
                .field('description', 'Black case, cracked corner, cat sticker')
                .field('category', 'phone')
                .field('location', 'Central Library')
                .field('contact', '+91 98765 43210')
                .field('status', 'resolved')
                .field('owner', ben.user.id)
                .attach('image', PNG, { filename: 'phone.png', contentType: 'image/png' });
            expect(res.status).toBe(201);
            expect(res.body.savedItem.status).toBe('open');
            expect(res.body.savedItem.isOwner).toBe(true);
            expect(res.body.savedItem.image).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
            expect(res.body.possibleMatches).toEqual([]);
            lostId = res.body.savedItem._id;

            const img = await request(app).get(res.body.savedItem.image);
            expect(img.status).toBe(200);
        });

        it('posts a found item as JSON and immediately gets the lost item as a match', async () => {
            const res = await request(app).post('/items').set(ben.auth).send({
                type: 'found',
                name: 'Black iPhone',
                description: 'cat sticker on the back',
                category: 'phone',
                location: 'library entrance',
                contact: 'ben@example.com',
            });
            expect(res.status).toBe(201);
            foundId = res.body.savedItem._id;
            const [match] = res.body.possibleMatches;
            expect(match._id).toBe(lostId);
            expect(match.score).toBeGreaterThan(25);
            expect(match.reasons.length).toBeGreaterThan(0);
            expect(match.contact).toBe('+91 98765 43210'); // Ben is logged in
        });

        it('does not match a user with their own posts', async () => {
            const res = await request(app).post('/items').set(asha.auth).send({
                type: 'found',
                name: 'iPhone 13',
                category: 'phone',
                location: 'Central Library',
                contact: 'asha@example.com',
            });
            expect(res.body.possibleMatches.map((m) => m._id)).not.toContain(lostId);
            await request(app).delete(`/items/${res.body.savedItem._id}`).set(asha.auth).expect(200);
        });

        it('finds matches later too, via /items/:id/matches', async () => {
            const res = await request(app).get(`/items/${lostId}/matches`);
            expect(res.status).toBe(200);
            expect(res.body[0]._id).toBe(foundId);
            expect(res.body[0].contact).toBeUndefined(); // anonymous visitor
        });

        it('rejects invalid posts with a helpful message', async () => {
            const res = await request(app).post('/items').set(asha.auth).send({ type: 'lost', name: 'Keys' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Where was it lost or found/);
        });

        it('rejects non-image uploads', async () => {
            const res = await request(app)
                .post('/items')
                .set(asha.auth)
                .field('type', 'lost')
                .attach('image', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/JPG, PNG or WebP/);
        });
    });

    describe('browsing and privacy', () => {
        it('lists items without contact details, with totals', async () => {
            const res = await request(app).get('/items');
            expect(res.status).toBe(200);
            expect(res.headers['x-total-count']).toBe('2');
            expect(res.body.every((i) => i.contact === undefined)).toBe(true);
            expect(JSON.stringify(res.body)).not.toMatch(/@example\.com|98765/);
        });

        it('filters and searches', async () => {
            expect((await request(app).get('/items?type=lost')).body.map((i) => i._id)).toEqual([lostId]);
            expect((await request(app).get('/items?q=sticker')).body).toHaveLength(2);
            expect((await request(app).get('/items?q=cracked')).body.map((i) => i._id)).toEqual([lostId]);
            expect((await request(app).get('/items?q=library&type=found')).body.map((i) => i._id)).toEqual([foundId]);
            expect((await request(app).get('/items?q=(unbalanced[')).status).toBe(200); // regex is escaped
            expect((await request(app).get('/items/type/found')).body.map((i) => i._id)).toEqual([foundId]);
        });

        it('shows contact on the detail page only to logged-in users', async () => {
            const anon = await request(app).get(`/items/${lostId}`);
            expect(anon.body.contact).toBeUndefined();
            expect(anon.body.contactHidden).toBe(true);
            expect(anon.body.postedBy).toBe('Asha');

            const signedIn = await request(app).get(`/items/${lostId}`).set(ben.auth);
            expect(signedIn.body.contact).toBe('+91 98765 43210');
            expect(signedIn.body.isOwner).toBe(false);
        });

        it('returns 404 for an item that does not exist', async () => {
            const res = await request(app).get('/items/64b7f9f9f9f9f9f9f9f9f9f9');
            expect(res.status).toBe(404);
        });
    });

    describe('ownership', () => {
        it("doesn't let someone else edit or delete a post", async () => {
            expect((await request(app).put(`/items/${lostId}`).set(ben.auth).send({ name: 'mine now' })).status).toBe(403);
            expect((await request(app).delete(`/items/${lostId}`).set(ben.auth)).status).toBe(403);
        });

        it('lets the owner edit their post', async () => {
            const res = await request(app).put(`/items/${lostId}`).set(asha.auth).send({ description: '' });
            expect(res.status).toBe(200);
            expect(res.body.description).toBe('');
        });

        it('shows the owner their posts with match counts', async () => {
            const res = await request(app).get('/items/mine').set(asha.auth);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].matchCount).toBe(1);
            expect(res.body[0].contact).toBe('+91 98765 43210');
        });

        it('marks an item as reunited', async () => {
            const res = await request(app).patch(`/items/${lostId}`).set(asha.auth).send({ status: 'resolved' });
            expect(res.body.status).toBe('resolved');
            expect(res.body.resolvedAt).toBeTruthy();

            expect((await request(app).get('/items')).body.map((i) => i._id)).toEqual([foundId]);
            expect((await request(app).get('/items?status=resolved')).body.map((i) => i._id)).toEqual([lostId]);
            expect((await request(app).get(`/items/${foundId}/matches`)).body).toEqual([]);

            const stats = await request(app).get('/stats');
            expect(stats.body).toEqual({ lost: 0, found: 1, reunited: 1, total: 2 });
        });

        it('deletes a post and its photo', async () => {
            const item = await request(app).get(`/items/${lostId}`);
            const imageFile = path.join(process.env.UPLOAD_DIR, path.basename(item.body.image));
            expect(fs.existsSync(imageFile)).toBe(true);

            expect((await request(app).delete(`/items/${lostId}`).set(asha.auth)).status).toBe(200);
            expect((await request(app).get(`/items/${lostId}`)).status).toBe(404);
            await new Promise((r) => setTimeout(r, 50));
            expect(fs.existsSync(imageFile)).toBe(false);
        });
    });
});
