import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

import Campaign from '../models/Campaign.js';
import Recipient from '../models/Recipient.js';
import Unsubscribe from '../models/Unsubscribe.js';
import EmailAccount from '../models/EmailAccount.js';
import User from '../models/User.js';

// Configuration
const BATCH_SIZE = 14; // Send max 14 emails per batch to stay under AWS sandbox/standard rate limits
const INTERVAL_MS = 1000; // 1 second
const PIXEL_URL = process.env.BASE_URL || 'http://localhost:3000'; // Make sure BASE_URL is set in prod

export function startCampaignWorker() {
    console.log('Campaign Worker started. Polling every second...');

    // Using setInterval to process campaigns
    setInterval(processCampaigns, INTERVAL_MS);
}

async function processCampaigns() {
    try {
        // Find campaigns currently in 'Sending' state
        const campaigns = await Campaign.find({ status: 'Sending' }).populate('senderAccount');

        for (const camp of campaigns) {
            await processBatch(camp);
        }
    } catch (err) {
        console.error('Error in campaign worker:', err);
    }
}

async function processBatch(campaign) {
    try {
        const user = await User.findById(campaign.userId);
        if (!user) return;

        // Fetch pending recipients
        const pending = await Recipient.find({ campaignId: campaign._id, status: 'Pending' }).limit(BATCH_SIZE);

        // If no pending left, mark campaign as completed
        if (pending.length === 0) {
            campaign.status = 'Completed';
            campaign.completedAt = new Date();
            await campaign.save();
            return;
        }

        // Initialize SES for this user
        const sesClient = new SESClient({
            region: user.awsRegion || process.env.AWS_REGION,
            credentials: {
                accessKeyId: user.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: user.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        // Get sender email
        const account = campaign.senderAccount;
        if (!account) {
            campaign.status = 'Failed';
            await campaign.save();
            return;
        }
        const senderDomain = account.domain;
        const senderEmail = `${account.prefix}@${senderDomain}`;

        // Track the sending results
        let sentIncrement = 0;
        let failedIncrement = 0;

        for (const rec of pending) {
            const email = rec.email;

            // 1. Check if Unsubscribed
            const isUnsub = await Unsubscribe.findOne({ userId: user._id, email });
            if (isUnsub) {
                rec.status = 'Unsubscribed';
                await rec.save();
                failedIncrement++;
                continue;
            }

            // 2. Personalize subject and body
            let body = campaign.bodyHtml;
            let subject = campaign.subject;

            // Allow {{variable}} injection
            const vars = rec.variables ? Object.fromEntries(rec.variables) : {};
            for (const [key, val] of Object.entries(vars)) {
                const regex = new RegExp(`{{${key}}}`, 'gi');
                body = body.replace(regex, val);
                subject = subject.replace(regex, val);
            }

            // 3. Inject Unsubscribe Link & tracking pixel
            const emailBase64 = Buffer.from(email).toString('base64');
            const unsubUrl = `${PIXEL_URL}/unsubscribe/${user._id}/${emailBase64}`;

            // Add pixel if user enabled tracking
            if (user.preferences && user.preferences.trackOpens) {
                // We fake a generic logId for campaign (Or you can create emailLogs)
                const fakeLogId = `camp_${rec._id}`;
                body += `<br><img src="${PIXEL_URL}/api/track/${fakeLogId}.gif" alt="" width="1" height="1" border="0" style="height:1px;width:1px;border-width:0" />`;
            }

            // Append unsub link to body
            body += `<br><br><p style="font-size: 11px; color: #666;">You are receiving this email because you opted in. <a href="${unsubUrl}">Unsubscribe</a></p>`;

            // Construct Raw Email manually to inject List-Unsubscribe header
            const boundary = "NextPart_" + Date.now().toString(16);
            let rawMsg = `From: ${user.name} <${senderEmail}>\n`;
            rawMsg += `To: ${email}\n`;
            rawMsg += `Subject: ${subject}\n`;
            rawMsg += `MIME-Version: 1.0\n`;

            // VERY IMPORTANT for avoiding SPAM
            rawMsg += `List-Unsubscribe: <${unsubUrl}>\n`;
            rawMsg += `List-Unsubscribe-Post: List-Unsubscribe=One-Click\n`;

            rawMsg += `Content-Type: multipart/alternative; boundary="${boundary}"\n\n`;

            // HTML Part
            rawMsg += `--${boundary}\n`;
            rawMsg += `Content-Type: text/html; charset="UTF-8"\n\n`;
            rawMsg += `${body}\n\n`;
            rawMsg += `--${boundary}--`;

            try {
                const command = new SendRawEmailCommand({
                    RawMessage: { Data: Buffer.from(rawMsg, 'utf8') }
                });

                const response = await sesClient.send(command);
                rec.messageId = response.MessageId;
                rec.status = 'Sent';
                rec.sentAt = new Date();
                sentIncrement++;

                // If user wants emails logged... Since we track usage, let's bump usage
                if (!user.usage) user.usage = { emailsSent: 0 };
                user.usage.emailsSent = (user.usage.emailsSent || 0) + 1;
                await user.save();

            } catch (err) {
                rec.status = 'Failed';
                rec.error = err.message;
                failedIncrement++;
            }

            await rec.save();
        }

        // Update campaign counts
        campaign.sentCount += sentIncrement;
        campaign.failedCount += failedIncrement;
        await campaign.save();

    } catch (err) {
        console.error('Batch process failed:', err);
    }
}
