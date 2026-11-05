// Scores how likely a lost item and a found item are the same thing.
// Pure functions only (no database) so the logic is easy to test and tweak.
const { categoryLabel } = require('./categories');

const DAY = 24 * 60 * 60 * 1000;

// Words that carry no meaning for matching ("my black wallet near the gate" -> black, wallet, gate)
const STOPWORDS = new Set(`
a an and are as at be been but by for from had has have he her his i in is it its me my near
of on or our she so that the their them then there they this to was we were with you your
lost found lose losing finding left forgot item thing things please help someone anyone
very really some any one also just like about around inside outside back front side
`.split(/\s+/).filter(Boolean));

function stem(word) {
    if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.length > 4 && /(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
}

/** "Black LEATHER wallet, 2 cards!" -> ["black", "leather", "wallet", "card"] (unique, stemmed) */
function tokenize(text) {
    if (!text) return [];
    const words = String(text)
        .toLowerCase()
        .split(/[^\p{L}\p{M}\p{N}]+/u) // \p{M} keeps vowel signs in Hindi, Tamil, etc.
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
        .map(stem);
    return [...new Set(words)];
}

function normalize(text) {
    return tokenize(text).join(' ');
}

function intersect(a, b) {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x));
}

/**
 * Compare two items of opposite type.
 * Returns { score, reasons } - score 0 means "not a match".
 */
function scoreMatch(a, b) {
    if (!a || !b || a.type === b.type) return { score: 0, reasons: [] };

    let score = 0;
    let hasContentSignal = false; // something about the item itself, not just place/time
    const reasons = [];

    // 1. Category
    const catA = a.category || 'other';
    const catB = b.category || 'other';
    let categoryConflict = false;
    if (catA !== 'other' && catA === catB) {
        score += 20;
        hasContentSignal = true;
        reasons.push(`Same category: ${categoryLabel(catA)}`);
    } else if (catA !== 'other' && catB !== 'other' && catA !== catB) {
        categoryConflict = true;
    }

    // 2. Name
    const nameA = tokenize(a.name);
    const nameB = tokenize(b.name);
    const sharedName = intersect(nameA, nameB);
    if (sharedName.length) {
        score += Math.min(30, sharedName.length * 12);
        hasContentSignal = true;
        reasons.push(`Similar name: ${sharedName.join(', ')}`);
    }
    const normA = nameA.join(' ');
    const normB = nameB.join(' ');
    if (normA && normB && normA !== normB && (normA.includes(normB) || normB.includes(normA))) {
        score += 8;
        hasContentSignal = true;
    } else if (normA && normA === normB) {
        score += 10;
    }

    // 3. Details (colour, brand, markings...) from name + description
    const textA = tokenize(`${a.name || ''} ${a.description || ''}`);
    const textB = tokenize(`${b.name || ''} ${b.description || ''}`);
    const sharedDetails = intersect(textA, textB).filter((w) => !sharedName.includes(w));
    if (sharedDetails.length) {
        score += Math.min(24, sharedDetails.length * 4);
        hasContentSignal = true;
        reasons.push(`Shared details: ${sharedDetails.slice(0, 6).join(', ')}`);
    }

    // 4. Location
    const locA = tokenize(a.location);
    const locB = tokenize(b.location);
    if (locA.length && locA.join(' ') === locB.join(' ')) {
        score += 15;
        reasons.push(`Same place: ${a.location}`);
    } else {
        const sharedLoc = intersect(locA, locB);
        if (sharedLoc.length) {
            score += Math.min(12, sharedLoc.length * 6);
            reasons.push(`Nearby: ${sharedLoc.join(', ')}`);
        }
    }

    // 5. Dates - a thing can't be found long before it was lost
    const lost = a.type === 'lost' ? a : b;
    const found = a.type === 'found' ? a : b;
    if (lost.date && found.date) {
        const diffDays = (new Date(found.date) - new Date(lost.date)) / DAY;
        if (diffDays < -2) {
            score *= 0.5; // found before it was lost - unlikely but dates are often guessed
        } else if (Math.abs(diffDays) <= 3) {
            score += 10;
            const apart = Math.round(Math.abs(diffDays));
            reasons.push(apart === 0 ? 'Same day' : `Dates line up (${apart} ${apart === 1 ? 'day' : 'days'} apart)`);
        } else if (diffDays <= 14) {
            score += 5;
        }
    }

    if (categoryConflict) score *= 0.4;
    // Same place + same day alone is not enough - need something about the item itself.
    if (!hasContentSignal) return { score: 0, reasons: [] };

    score = Math.round(score);
    return { score, reasons };
}

function strengthOf(score) {
    if (score >= 50) return 'strong';
    if (score >= 25) return 'good';
    return 'weak';
}

const MIN_SCORE = 15;

/**
 * Rank candidate items against `item`.
 * Returns [{ item, score, strength, reasons }] best first.
 */
// Works for ObjectIds, populated documents and plain strings.
const idOf = (v) => (v == null ? null : String(v._id ?? v));

function findMatches(item, candidates, { limit = 10, minScore = MIN_SCORE } = {}) {
    const ownerId = idOf(item.owner);
    const itemId = idOf(item._id);
    return candidates
        .filter((c) => c.type !== item.type)
        .filter((c) => (c.status || 'open') === 'open')
        .filter((c) => !itemId || idOf(c._id) !== itemId)
        .filter((c) => !ownerId || !c.owner || idOf(c.owner) !== ownerId)
        .map((c) => {
            const { score, reasons } = scoreMatch(item, c);
            return { item: c, score, strength: strengthOf(score), reasons };
        })
        .filter((m) => m.score >= minScore)
        .sort((x, y) => y.score - x.score)
        .slice(0, limit);
}

module.exports = { tokenize, normalize, scoreMatch, findMatches, strengthOf, MIN_SCORE };
