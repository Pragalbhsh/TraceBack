const mongoose = require('mongoose');
const { CATEGORY_VALUES } = require('../lib/categories');

const itemsSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['lost', 'found'],
            required: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, trim: true, maxlength: 1000, default: '' },
        category: { type: String, enum: CATEGORY_VALUES, default: 'other' },
        location: { type: String, required: true, trim: true, maxlength: 150 },
        // How people can reach the poster. Only shown to signed-in users (see lib/serialize.js).
        contact: { type: String, required: true, trim: true, maxlength: 150 },
        // The day the item was lost or found (not when it was posted - that's createdAt).
        date: { type: Date, default: Date.now },
        image: { type: String, default: null },
        // Cloudinary public_id or local filename, so the image can be removed with the post.
        imageId: { type: String, default: null, select: false },
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
        resolvedAt: { type: Date, default: null },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    },
    { timestamps: true }
);

itemsSchema.index({ type: 1, status: 1, date: -1 });

// Keep the original model name ("items") so existing data in MongoDB is still found.
const Item = mongoose.models.items || mongoose.model('items', itemsSchema);

module.exports = Item;
