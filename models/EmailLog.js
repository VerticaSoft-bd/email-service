import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: String,
        required: true
    },
    recipient: {
        type: String,
        required: true
    },
    subject: {
        type: String
    },
    status: {
        type: String,
        enum: ['Sent', 'Delivered', 'Bounced', 'Failed', 'Complaint'],
        default: 'Sent'
    },
    messageId: {
        type: String // AWS SES message ID
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

export default mongoose.model('EmailLog', emailLogSchema);
