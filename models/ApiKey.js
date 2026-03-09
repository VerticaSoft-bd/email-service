import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    keyHash: {
        type: String,
        required: true, // The hashed API key
        unique: true
    },
    prefix: {
        type: String,
        required: true // First 8 chars for display purposes
    },
    permissions: {
        type: [String],
        enum: ['send_email', 'read_logs', 'manage_domains'],
        default: ['send_email']
    },
    rateLimit: {
        type: Number,
        default: 100 // requests per hour
    },
    lastUsedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ApiKey', apiKeySchema);
