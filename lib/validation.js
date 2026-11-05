// Request validation with zod. Anything not listed here is dropped, so clients
// can't set fields like `owner` or `status` by sneaking them into the body.
const { z } = require('zod');
const { CATEGORY_VALUES } = require('./categories');

// Multipart forms send everything as strings, and empty inputs as "".
const blankToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = (schema) => z.preprocess(blankToUndefined, schema.optional());

const notInFuture = (d) => d.getTime() <= Date.now() + 36 * 60 * 60 * 1000; // allow for time zones

const itemFields = {
    type: z.enum(['lost', 'found'], { error: 'Choose whether the item was lost or found' }),
    name: z
        .string({ error: 'Give the item a short name' })
        .trim()
        .min(2, 'Give the item a short name (at least 2 characters)')
        .max(100, 'Name is too long (max 100 characters)'),
    description: optional(z.string().trim().max(1000, 'Description is too long (max 1000 characters)')),
    category: optional(z.enum(CATEGORY_VALUES, { error: 'Pick a category from the list' })),
    location: z
        .string({ error: 'Where was it lost or found?' })
        .trim()
        .min(2, 'Where was it lost or found?')
        .max(150, 'Location is too long (max 150 characters)'),
    contact: z
        .string({ error: 'Add a way for people to reach you' })
        .trim()
        .min(3, 'Add a way for people to reach you')
        .max(150, 'Contact is too long (max 150 characters)'),
    date: optional(
        z.coerce.date({ error: 'Enter a valid date' }).refine(notInFuture, 'The date cannot be in the future')
    ),
};

const createItemSchema = z.object(itemFields);

const updateItemSchema = z
    .object({
        ...Object.fromEntries(Object.entries(itemFields).map(([k, v]) => [k, optional(v)])),
        // An empty description is a valid update (the owner cleared it).
        description: z.string().trim().max(1000, 'Description is too long (max 1000 characters)').optional(),
        status: optional(z.enum(['open', 'resolved'])),
        removeImage: optional(z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])),
    })
    .refine((o) => Object.values(o).some((v) => v !== undefined), 'Nothing to update');

const listQuerySchema = z.object({
    type: optional(z.enum(['lost', 'found'])),
    category: optional(z.enum(CATEGORY_VALUES)),
    status: optional(z.enum(['open', 'resolved', 'all'])),
    q: optional(z.string().trim().max(100)),
    location: optional(z.string().trim().max(100)),
    sort: optional(z.enum(['newest', 'oldest'])),
    page: optional(z.coerce.number().int().min(1).max(1000)),
    limit: optional(z.coerce.number().int().min(1).max(100)),
}).transform((q) => ({ ...q, status: q.status || 'open', sort: q.sort || 'newest', page: q.page || 1, limit: q.limit || 24 }));

const registerSchema = z.object({
    name: z.string({ error: 'Enter your name' }).trim().min(2, 'Name must be at least 2 characters').max(60),
    email: z.string({ error: 'Enter your email' }).trim().toLowerCase().pipe(z.email('Enter a valid email address')),
    password: z
        .string({ error: 'Choose a password' })
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be at most 72 characters'),
});

const loginSchema = z.object({
    email: z.string({ error: 'Enter your email' }).trim().toLowerCase().pipe(z.email('Enter a valid email address')),
    password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password').max(200),
});

const updateMeSchema = z
    .object({
        name: optional(z.string().trim().min(2).max(60)),
        emailAlerts: optional(z.boolean()),
    })
    .refine((o) => Object.values(o).some((v) => v !== undefined), 'Nothing to update');

class ValidationError extends Error {
    constructor(issues) {
        super(issues[0]?.message || 'Invalid input');
        this.status = 400;
        this.details = issues.map((i) => ({ field: i.path.join('.') || undefined, message: i.message }));
    }
}

/** Parse or throw a 400 with a friendly message. */
function parse(schema, data) {
    const result = schema.safeParse(data ?? {});
    if (!result.success) throw new ValidationError(result.error.issues);
    return result.data;
}

module.exports = {
    createItemSchema,
    updateItemSchema,
    listQuerySchema,
    registerSchema,
    loginSchema,
    updateMeSchema,
    parse,
    ValidationError,
};
