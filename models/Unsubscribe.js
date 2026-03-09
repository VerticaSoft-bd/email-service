import mongoose from 'mongoose';

const unsubscribeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }, // Optional traceback
    reason: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// A user cannot unsubscribe the same email multiple times
unsubscribeSchema.index({ userId: 1, email: 1 }, { unique: true });

export default mongoose.model('Unsubscribe', unsubscribeSchema);
