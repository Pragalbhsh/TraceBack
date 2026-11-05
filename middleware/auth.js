const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/user');

function signToken(user) {
    return jwt.sign({ sub: String(user._id) }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function readToken(req) {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

async function loadUser(req) {
    const token = readToken(req);
    if (!token) return null;
    let payload;
    try {
        payload = jwt.verify(token, config.jwt.secret);
    } catch {
        return undefined; // present but invalid/expired
    }
    return (await User.findById(payload.sub)) || undefined;
}

/** Rejects the request with 401 unless a valid token is sent. Sets req.user. */
async function requireAuth(req, res, next) {
    const user = await loadUser(req);
    if (!user) {
        return res.status(401).json({
            error: user === undefined ? 'Your session has expired. Please log in again.' : 'Please log in to continue.',
        });
    }
    req.user = user;
    next();
}

/** Sets req.user when a valid token is sent, but never blocks the request. */
async function optionalAuth(req, res, next) {
    req.user = (await loadUser(req)) || null;
    next();
}

module.exports = { signToken, requireAuth, optionalAuth };
