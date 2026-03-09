import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    domain: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    verificationToken: {
        type: String,
        default: null
    },
    dkimTokens: {
        type: [String],
        default: []
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user cannot add the same domain multiple times
domainSchema.index({ userId: 1, domain: 1 }, { unique: true });

export default mongoose.model('Domain', domainSchema);
