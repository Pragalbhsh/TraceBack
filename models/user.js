const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 60 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
        passwordHash: { type: String, required: true, select: false },
        // Email me when someone posts an item that looks like a match for one of mine.
        emailAlerts: { type: Boolean, default: true },
    },
    { timestamps: true }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
    return {
        id: this._id.toString(),
        name: this.name,
        email: this.email,
        emailAlerts: this.emailAlerts,
        createdAt: this.createdAt,
    };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
