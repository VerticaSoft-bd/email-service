import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true }, // Internal tracking name
    senderAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailAccount', required: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String },
    status: {
        type: String,
        enum: ['Draft', 'Uploading', 'Ready', 'Sending', 'Completed', 'Failed'],
        default: 'Draft'
    },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date }
});

export default mongoose.model('Campaign', campaignSchema);
