import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: { // Login email
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    company: {
        type: String,
        trim: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    senderEmail: { // Default sender email for this user
        type: String,
        trim: true,
        lowercase: true,
    },
    domain: {
        type: String,
        trim: true,
        lowercase: true,
    },
    domainVerified: {
        type: Boolean,
        default: false,
    },
    dkimTokens: {
        type: [String],
        default: [],
    },
    verificationToken: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    usage: {
        emailsSent: { type: Number, default: 0 },
        apiRequests: { type: Number, default: 0 }
    }
});

const User = mongoose.model('User', userSchema);

export default User;
