import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    to: {
        type: String,
        required: [true, 'Recipient email is required'],
        trim: true,
        lowercase: true,
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
    },
    body: {
        type: String,
        required: [true, 'Email body is required'],
    },
    messageId: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'queued'],
        default: 'queued',
    },
    errorMessage: {
        type: String,
        default: null,
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
});

const Email = mongoose.model('Email', emailSchema);

export default Email;
