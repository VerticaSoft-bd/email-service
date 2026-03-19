import express from 'express';
import Unsubscribe from '../models/Unsubscribe.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * AWS SNS Webhook for SES Bounces and Complaints
 * This endpoint should be set as the HTTPS destination for an SNS Topic.
 */
router.post('/', async (req, res) => {
    let body;
    try {
        body = JSON.parse(req.body); // SNS sends text/plain, but we need JSON
    } catch (e) {
        body = req.body;
    }

    const type = req.headers['x-amz-sns-message-type'];

    if (type === 'SubscriptionConfirmation') {
        const subscribeUrl = body.SubscribeURL;
        console.log('SNS Subscription Confirmation URL:', subscribeUrl);
        // Automatically confirm subscription
        try {
            await fetch(subscribeUrl);
            console.log('SNS Subscription Confirmed');
        } catch (err) {
            console.error('Failed to confirm SNS subscription:', err);
        }
        return res.sendStatus(200);
    }

    if (type === 'Notification') {
        const message = JSON.parse(body.Message);
        const notificationType = message.notificationType; // Bounce, Complaint, or Delivery

        if (notificationType === 'Bounce') {
            const bounce = message.bounce;
            const recipients = bounce.bouncedRecipients;
            for (const recipient of recipients) {
                const email = recipient.emailAddress.toLowerCase();
                await handleSuppression(email, 'bounce', bounce);
            }
        } else if (notificationType === 'Complaint') {
            const complaint = message.complaint;
            const recipients = complaint.complainedRecipients;
            for (const recipient of recipients) {
                const email = recipient.emailAddress.toLowerCase();
                await handleSuppression(email, 'complaint', complaint);
            }
        }
    }

    res.sendStatus(200);
});

/**
 * Add email to suppression list
 */
async function handleSuppression(email, type, metadata) {
    try {
        // We need to find which user this email belongs to, or just make it global if applicable.
        // For now, we'll mark it for all users or try to find a relevant user.
        // A better way is to include the userId in the 'Source' or 'ConfigurationSet' when sending.
        // But for a simple SaaS, we can just block it globally or find the last sender.
        
        // Let's find all users who have sent to this email recently? 
        // Or just create a global suppression that all senders check.
        // To satisfy AWS, we MUST stop sending to this email.
        
        // We'll create an entry for each user who might be sending to this email? 
        // Actually, the Unsubscribe model requires a userId.
        // Let's find the last User who sent to this email.
        
        // NOTE: In a real multi-tenant app, you'd track this more precisely.
        // For now, we'll find any user that has 'senderEmail' configured and add it.
        // Or better, we can allow Unsubscribe without userId if it's meant to be global?
        // But the schema says userId is required.
        
        const users = await User.find({}); // Get all users (or we could optimize this)
        
        for (const user of users) {
             await Unsubscribe.findOneAndUpdate(
                { userId: user._id, email: email },
                { 
                    userId: user._id, 
                    email: email, 
                    type: type, 
                    metadata: metadata,
                    reason: `AWS SES ${type} received`
                },
                { upsert: true }
            );
        }
        
        console.log(`Suppressed ${email} due to ${type}`);
    } catch (err) {
        console.error('Error handling suppression:', err);
    }
}

export default router;
