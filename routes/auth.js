const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const config = require('../config');
const { signToken, requireAuth } = require('../middleware/auth');
const { parse, registerSchema, loginSchema, updateMeSchema } = require('../lib/validation');

const router = express.Router();

// Slow down password guessing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post('/register', authLimiter, async (req, res) => {
    const { name, email, password } = parse(registerSchema, req.body);
    if (await User.findOne({ email })) {
        return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
    }
    const user = new User({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    await user.save();
    res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
});

router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
        return res.status(401).json({ error: 'Wrong email or password.' });
    }
    res.json({ token: signToken(user), user: user.toPublicJSON() });
});

router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user.toPublicJSON() });
});

router.patch('/me', requireAuth, async (req, res) => {
    const changes = parse(updateMeSchema, req.body);
    Object.entries(changes).forEach(([k, v]) => v !== undefined && req.user.set(k, v));
    await req.user.save();
    res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;
