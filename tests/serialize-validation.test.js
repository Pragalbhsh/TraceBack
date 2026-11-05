const { publicItem } = require('../lib/serialize');
const { parse, createItemSchema, updateItemSchema, listQuerySchema, registerSchema } = require('../lib/validation');

const item = {
    _id: '64b7f9f9f9f9f9f9f9f9f9f9',
    type: 'found',
    name: 'Wallet',
    location: 'Bus stop',
    contact: '+91 98765 43210',
    owner: { _id: 'owner1', name: 'Asha Rao', email: 'asha@example.com' },
    date: new Date(),
};

describe('publicItem (privacy)', () => {
    it('hides contact details from visitors who are not logged in', () => {
        const out = publicItem(item, null);
        expect(out.contact).toBeUndefined();
        expect(out.contactHidden).toBe(true);
    });

    it('shows contact details to logged-in users', () => {
        expect(publicItem(item, { _id: 'someone' }).contact).toBe('+91 98765 43210');
    });

    it('never leaks the owner email or id, only a first name', () => {
        const out = publicItem(item, { _id: 'someone' });
        expect(JSON.stringify(out)).not.toMatch(/asha@example.com|owner1/);
        expect(out.postedBy).toBe('Asha');
    });

    it('flags the owner', () => {
        expect(publicItem(item, { _id: 'owner1' }).isOwner).toBe(true);
        expect(publicItem(item, { _id: 'other' }).isOwner).toBe(false);
    });

    it('can leave contact out entirely (lists)', () => {
        const out = publicItem(item, { _id: 'x' }, { includeContact: false });
        expect(out.contact).toBeUndefined();
        expect(out.contactHidden).toBeUndefined();
    });
});

describe('validation', () => {
    const valid = { type: 'lost', name: 'Keys', location: 'Library', contact: 'me@example.com' };

    it('accepts a valid post and drops fields clients must not set', () => {
        const out = parse(createItemSchema, { ...valid, owner: 'hacker', status: 'resolved', _id: 'x' });
        expect(out).toEqual(valid);
    });

    it('treats blank optional fields from forms as missing', () => {
        const out = parse(createItemSchema, { ...valid, date: '', category: '', description: '' });
        expect(out).toEqual(valid);
    });

    it('rejects missing fields with friendly messages', () => {
        expect(() => parse(createItemSchema, { type: 'lost' })).toThrow('Give the item a short name');
        expect(() => parse(createItemSchema, { ...valid, type: 'stolen' })).toThrow(/lost or found/);
        expect(() => parse(createItemSchema, { ...valid, category: 'spaceship' })).toThrow(/category/);
    });

    it('rejects dates in the future', () => {
        const future = new Date(Date.now() + 5 * 86400000).toISOString();
        expect(() => parse(createItemSchema, { ...valid, date: future })).toThrow(/future/);
    });

    it('allows partial updates, including clearing the description', () => {
        expect(parse(updateItemSchema, { status: 'resolved' })).toEqual({ status: 'resolved' });
        expect(parse(updateItemSchema, { description: '' })).toEqual({ description: '' });
        expect(() => parse(updateItemSchema, {})).toThrow('Nothing to update');
    });

    it('fills in list defaults', () => {
        expect(parse(listQuerySchema, {})).toEqual({ status: 'open', sort: 'newest', page: 1, limit: 24 });
        expect(() => parse(listQuerySchema, { limit: '5000' })).toThrow();
    });

    it('normalises emails and enforces password length', () => {
        expect(parse(registerSchema, { name: 'Asha', email: ' Asha@Example.COM ', password: 'longenough' }).email).toBe(
            'asha@example.com'
        );
        expect(() => parse(registerSchema, { name: 'Asha', email: 'asha@example.com', password: 'short' })).toThrow(/8 characters/);
    });
});
