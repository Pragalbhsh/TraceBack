// Lost & found items: browse, search, post, edit, mark as reunited, delete, and matching.
const express = require('express');
const rateLimit = require('express-rate-limit');
const Item = require('../models/items');
const config = require('../config');
const { upload, storeImage, removeImage } = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { parse, createItemSchema, updateItemSchema, listQuerySchema } = require('../lib/validation');
const { findMatches } = require('../lib/matching');
const { publicItem, publicMatch } = require('../lib/serialize');
const { matchAlert } = require('../lib/mailer');

const router = express.Router();

const OWNER_FIELDS = 'name email emailAlerts';
const OPEN = { $ne: 'resolved' }; // older posts have no status field - treat them as open
const idOf = (v) => (v == null ? null : String(v._id ?? v));

const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    message: { error: 'You have posted a lot in the last hour. Please try again later.' },
});

function notFound() {
    const err = new Error('Item not found');
    err.status = 404;
    return err;
}

function checkId(id) {
    if (!/^[a-f\d]{24}$/i.test(id)) {
        const err = new Error('Invalid item id');
        err.status = 400;
        throw err;
    }
}

async function getItem(id, { withImageId = false } = {}) {
    checkId(id);
    let query = Item.findById(id).populate('owner', 'name');
    if (withImageId) query = query.select('+imageId');
    const item = await query;
    if (!item) throw notFound();
    return item;
}

function assertOwner(item, user) {
    if (!item.owner || idOf(item.owner) !== idOf(user)) {
        const err = new Error('You can only change your own posts');
        err.status = 403;
        throw err;
    }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Open items of the opposite type that could match `item`. */
async function loadCandidates(type, excludeOwner) {
    const filter = { type, status: OPEN };
    if (excludeOwner) filter.owner = { $ne: excludeOwner };
    // The newest 500 is plenty for a campus/city-sized board and keeps matching fast.
    return Item.find(filter).sort({ _id: -1 }).limit(500).populate('owner', OWNER_FIELDS);
}

async function matchesFor(item) {
    if (item.status === 'resolved') return [];
    const opposite = item.type === 'lost' ? 'found' : 'lost';
    const candidates = await loadCandidates(opposite, idOf(item.owner));
    return findMatches(item, candidates);
}

/** Email owners of good matches about a new post. Runs after the response is sent. */
async function notifyMatches(newItem, matches) {
    const alerts = matches
        .filter((m) => m.strength !== 'weak')
        .filter((m) => m.item.owner && m.item.owner.email && m.item.owner.emailAlerts !== false)
        .slice(0, 5)
        .map((m) => matchAlert({ recipient: m.item.owner, theirItem: m.item, newItem, match: m }));
    const results = await Promise.allSettled(alerts);
    results.filter((r) => r.status === 'rejected').forEach((r) => console.error('Match email failed:', r.reason?.message));
}

// ---------------------------------------------------------------------------
// Browse & search: GET /items?type=lost&category=phone&q=black&location=library&status=open&page=1&limit=24
// Returns an array (as before); totals are in the X-Total-Count / X-Total-Pages headers.
router.get('/', optionalAuth, async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    const filter = {};
    if (q.type) filter.type = q.type;
    if (q.category) filter.category = q.category;
    if (q.status === 'open') filter.status = OPEN;
    if (q.status === 'resolved') filter.status = 'resolved';
    if (q.location) filter.location = new RegExp(escapeRegex(q.location), 'i');
    if (q.q) {
        const words = q.q.split(/\s+/).filter(Boolean).slice(0, 6);
        filter.$and = words.map((w) => {
            const re = new RegExp(escapeRegex(w), 'i');
            return { $or: [{ name: re }, { description: re }, { location: re }] };
        });
    }

    const [items, total] = await Promise.all([
        Item.find(filter)
            .sort({ _id: q.sort === 'oldest' ? 1 : -1 })
            .skip((q.page - 1) * q.limit)
            .limit(q.limit)
            .populate('owner', 'name'),
        Item.countDocuments(filter),
    ]);

    res.set('X-Total-Count', String(total));
    res.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / q.limit))));
    res.json(items.map((i) => publicItem(i, req.user, { includeContact: false })));
});

// Kept for older clients: GET /items/type/lost
router.get('/type/:type', optionalAuth, async (req, res) => {
    const { type } = parse(listQuerySchema, { type: req.params.type });
    const items = await Item.find({ type, status: OPEN }).sort({ _id: -1 }).limit(100).populate('owner', 'name');
    res.json(items.map((i) => publicItem(i, req.user, { includeContact: false })));
});

// The signed-in user's own posts, each with how many possible matches it has.
router.get('/mine', requireAuth, async (req, res) => {
    const items = await Item.find({ owner: req.user._id }).sort({ _id: -1 }).populate('owner', 'name');
    const open = items.filter((i) => i.status !== 'resolved');
    const needs = new Set(open.map((i) => (i.type === 'lost' ? 'found' : 'lost')));
    const pools = {};
    await Promise.all([...needs].map(async (t) => (pools[t] = await loadCandidates(t, req.user._id))));

    res.json(
        items.map((i) => {
            const pool = pools[i.type === 'lost' ? 'found' : 'lost'];
            const matches = i.status === 'resolved' || !pool ? [] : findMatches(i, pool);
            return { ...publicItem(i, req.user), matchCount: matches.length, bestMatch: matches[0]?.strength || null };
        })
    );
});

router.get('/:id', optionalAuth, async (req, res) => {
    const item = await getItem(req.params.id);
    res.json(publicItem(item, req.user));
});

// Possible matches for an existing item - so a post made today finds things posted tomorrow.
router.get('/:id/matches', optionalAuth, async (req, res) => {
    const item = await getItem(req.params.id);
    const matches = await matchesFor(item);
    res.json(matches.map((m) => publicMatch(m, req.user)));
});

router.post('/', requireAuth, postLimiter, upload.single('image'), async (req, res) => {
    const data = parse(createItemSchema, req.body);
    const image = await storeImage(req);

    const item = new Item({
        ...data,
        owner: req.user._id,
        image: image?.url || null,
        imageId: image?.id || null,
    });
    await item.save();
    req.storedImage = null; // saved with the item - keep it

    const matches = await matchesFor(item);
    const saved = { ...item.toObject(), owner: { _id: req.user._id, name: req.user.name } };
    res.status(201).json({
        savedItem: publicItem(saved, req.user),
        possibleMatches: matches.map((m) => publicMatch(m, req.user)),
    });

    notifyMatches(item, matches).catch((err) => console.error('Match notification error:', err));
});

async function updateItem(req, res) {
    const item = await getItem(req.params.id, { withImageId: true });
    assertOwner(item, req.user);
    const { removeImage: dropImage, ...changes } = parse(updateItemSchema, req.body || {});

    const oldImageId = item.imageId;
    const image = await storeImage(req);
    if (image) {
        item.image = image.url;
        item.imageId = image.id;
    } else if (dropImage) {
        item.image = null;
        item.imageId = null;
    }

    if (changes.status && changes.status !== item.status) {
        item.resolvedAt = changes.status === 'resolved' ? new Date() : null;
    }
    Object.entries(changes).forEach(([k, v]) => v !== undefined && item.set(k, v));

    await item.save();
    req.storedImage = null;
    if (oldImageId && oldImageId !== item.imageId) removeImage(oldImageId);

    res.json(publicItem(item, req.user));
}

router.put('/:id', requireAuth, upload.single('image'), updateItem);
router.patch('/:id', requireAuth, upload.single('image'), updateItem);

router.delete('/:id', requireAuth, async (req, res) => {
    const item = await getItem(req.params.id, { withImageId: true });
    assertOwner(item, req.user);
    await item.deleteOne();
    removeImage(item.imageId);
    res.json({ message: 'item deleted' });
});

module.exports = router;
