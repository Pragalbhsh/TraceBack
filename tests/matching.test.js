const { tokenize, scoreMatch, findMatches } = require('../lib/matching');

const day = (n) => new Date(Date.UTC(2026, 2, 1 + n));

const lostPhone = {
    _id: 'l1',
    type: 'lost',
    name: 'iPhone 13',
    description: 'Black case with a cracked corner and a sticker of a cat',
    category: 'phone',
    location: 'Central Library 2nd floor',
    date: day(0),
    owner: 'userA',
};

describe('tokenize', () => {
    it('lowercases, drops punctuation and filler words, and stems plurals', () => {
        expect(tokenize('Lost my KEYS, near the Library!!')).toEqual(['key', 'library']);
        expect(tokenize('Glasses & watches')).toEqual(['glass', 'watch']);
    });

    it('handles empty input', () => {
        expect(tokenize('')).toEqual([]);
        expect(tokenize(undefined)).toEqual([]);
    });

    it('keeps non-English letters', () => {
        expect(tokenize('बटुआ wallet')).toEqual(['बटुआ', 'wallet']);
    });
});

describe('scoreMatch', () => {
    it('scores a clear match highly and explains why', () => {
        const found = {
            type: 'found',
            name: 'Black iPhone',
            description: 'cracked case, cat sticker on the back',
            category: 'phone',
            location: 'library',
            date: day(1),
        };
        const { score, reasons } = scoreMatch(lostPhone, found);
        expect(score).toBeGreaterThanOrEqual(50);
        expect(reasons.join(' ')).toMatch(/Same category/);
        expect(reasons.join(' ')).toMatch(/iphone/);
        expect(reasons.join(' ')).toMatch(/cat/);
    });

    it('never matches two items of the same type', () => {
        expect(scoreMatch(lostPhone, { ...lostPhone, _id: 'x' }).score).toBe(0);
    });

    it('does not match on place and time alone', () => {
        const found = { type: 'found', name: 'Umbrella', category: 'other', location: 'Central Library 2nd floor', date: day(0) };
        expect(scoreMatch(lostPhone, found).score).toBe(0);
    });

    it('regression: an item with no name no longer matches everything', () => {
        // The old code had `a && b && a.includes(b) || b.includes(a)`, and "".includes("") is true.
        const lost = { type: 'lost', name: '', location: 'Gate 1' };
        const found = { type: 'found', name: 'Water bottle', location: 'Canteen' };
        expect(scoreMatch(lost, found).score).toBe(0);
    });

    it('matches locations case-insensitively and partially', () => {
        const a = { type: 'lost', name: 'Keys', category: 'keys', location: 'MAIN GATE', date: day(0) };
        const b = { type: 'found', name: 'keys', category: 'keys', location: 'main gate', date: day(0) };
        const c = { type: 'found', name: 'keys', category: 'keys', location: 'near the main gate parking', date: day(0) };
        expect(scoreMatch(a, b).reasons).toContain('Same place: MAIN GATE');
        expect(scoreMatch(a, c).reasons.some((r) => r.startsWith('Nearby'))).toBe(true);
    });

    it('penalises a clear category conflict', () => {
        const wallet = { type: 'found', name: 'black thing', category: 'wallet', location: 'library', date: day(0) };
        const phoneSameWords = { ...wallet, category: 'phone' };
        expect(scoreMatch(lostPhone, wallet).score).toBeLessThan(scoreMatch(lostPhone, phoneSameWords).score);
    });

    it('penalises items found well before they were lost', () => {
        const before = { type: 'found', name: 'iPhone', category: 'phone', location: 'library', date: day(-20) };
        const after = { ...before, date: day(1) };
        expect(scoreMatch(lostPhone, before).score).toBeLessThan(scoreMatch(lostPhone, after).score);
    });

    it('describes how far apart the dates are', () => {
        const lost = { type: 'lost', name: 'Wallet', category: 'wallet', location: 'park', date: day(2) };
        const found = (d) => ({ type: 'found', name: 'Wallet', category: 'wallet', location: 'park', date: day(d) });
        expect(scoreMatch(lost, found(2)).reasons).toContain('Same day');
        expect(scoreMatch(lost, found(0)).reasons).toContain('Dates line up (2 days apart)'); // found a bit "before" - dates are guesses
        expect(scoreMatch(lost, found(3)).reasons).toContain('Dates line up (1 day apart)');
    });

    it('recognises one name inside the other (phone / iphone)', () => {
        const a = { type: 'lost', name: 'phone', location: 'x' };
        const b = { type: 'found', name: 'iphone', location: 'y' };
        expect(scoreMatch(a, b).score).toBeGreaterThan(0);
    });
});

describe('findMatches', () => {
    const candidates = [
        { _id: 'f1', type: 'found', name: 'iPhone', category: 'phone', location: 'library', date: day(1), owner: 'userB' },
        { _id: 'f2', type: 'found', name: 'Red umbrella', category: 'other', location: 'bus stop', date: day(1), owner: 'userB' },
        { _id: 'f3', type: 'found', name: 'iPhone 13 black', category: 'phone', location: 'Central Library', date: day(0), owner: 'userC' },
        { _id: 'f4', type: 'found', name: 'iPhone', category: 'phone', location: 'library', date: day(1), owner: 'userA' }, // same owner
        { _id: 'f5', type: 'found', name: 'iPhone', category: 'phone', location: 'library', date: day(1), status: 'resolved' },
        { _id: 'l9', type: 'lost', name: 'iPhone', category: 'phone', location: 'library', date: day(1) }, // same type
    ];

    it('returns the best matches first and skips irrelevant ones', () => {
        const matches = findMatches(lostPhone, candidates);
        expect(matches.map((m) => m.item._id)).toEqual(['f3', 'f1']);
        expect(matches[0].score).toBeGreaterThan(matches[1].score);
        expect(matches[0].strength).toBe('strong');
    });

    it('works with populated owners (documents instead of ids)', () => {
        const populated = candidates.map((c) => ({ ...c, owner: c.owner ? { _id: c.owner, name: 'x' } : c.owner }));
        const matches = findMatches({ ...lostPhone, owner: { _id: 'userA' } }, populated);
        expect(matches.map((m) => m.item._id)).toEqual(['f3', 'f1']);
    });

    it('respects the limit', () => {
        expect(findMatches(lostPhone, candidates, { limit: 1 })).toHaveLength(1);
    });
});
