import mongoose from 'mongoose';

const emailAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    prefix: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    domain: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String, // Hashed password for the specific email identity (e.g., SMTP or API usage if separate)
        required: true
    },
    mailboxSize: {
        type: Number, // In MB
        default: 1024
    },
    role: {
        type: String,
        default: 'member'
    },
    signature: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create compound index so user cannot create the same prefix at the same domain twice
emailAccountSchema.index({ prefix: 1, domain: 1 }, { unique: true });

export default mongoose.model('EmailAccount', emailAccountSchema);
