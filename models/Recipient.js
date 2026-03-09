import mongoose from 'mongoose';

const recipientSchema = new mongoose.Schema({
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    email: { type: String, required: true },
    variables: { type: Map, of: String, default: {} }, // Dynamic mapping for {{name}} etc
    status: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Unsubscribed'], default: 'Pending' },
    error: { type: String }, // Reason for failure
    messageId: { type: String }, // AWS SES ID
    sentAt: { type: Date }
});

// Fast lookup for worker
recipientSchema.index({ campaignId: 1, status: 1 });
// Prevent duplicate emails per campaign
recipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });

export default mongoose.model('Recipient', recipientSchema);
