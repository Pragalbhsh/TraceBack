// Controls what each viewer is allowed to see about an item.
// - Contact details are only shared with signed-in users (stops bots harvesting phone numbers/emails).
// - Owner identity (email, user id) is never exposed; the client just gets `isOwner`.

function toPlain(item) {
    return typeof item.toObject === 'function' ? item.toObject() : { ...item };
}

function publicItem(item, viewer, { includeContact = true } = {}) {
    const doc = toPlain(item);
    const ownerId = doc.owner ? String(doc.owner._id || doc.owner) : null;
    const viewerId = viewer ? String(viewer._id || viewer.id) : null;
    const isOwner = Boolean(ownerId && viewerId && ownerId === viewerId);
    const canSeeContact = includeContact && Boolean(viewer);

    const out = {
        _id: String(doc._id),
        id: String(doc._id),
        type: doc.type,
        name: doc.name,
        description: doc.description || '',
        category: doc.category || 'other',
        location: doc.location,
        date: doc.date,
        image: doc.image || null,
        status: doc.status || 'open',
        resolvedAt: doc.resolvedAt || null,
        createdAt: doc.createdAt || doc.date,
        updatedAt: doc.updatedAt || doc.date,
        postedBy: doc.owner && doc.owner.name ? doc.owner.name.split(' ')[0] : undefined,
        isOwner,
    };
    if (canSeeContact) out.contact = doc.contact;
    else if (includeContact) out.contactHidden = true;
    return out;
}

function publicMatch(match, viewer) {
    return {
        ...publicItem(match.item, viewer),
        score: match.score,
        strength: match.strength,
        reasons: match.reasons,
    };
}

module.exports = { publicItem, publicMatch };
