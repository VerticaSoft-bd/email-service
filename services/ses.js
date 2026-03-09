import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Use createRequire to load @aws-sdk from tmp-install/node_modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(join(__dirname, '..', 'tmp-install', 'node_modules', '/'));

const {
    SESClient,
    VerifyDomainIdentityCommand,
    VerifyDomainDkimCommand,
    GetIdentityVerificationAttributesCommand,
    SendEmailCommand,
} = require('@aws-sdk/client-ses');

/**
 * Create an SES client using the centralized AWS credentials from .env.
 */
function createSesClient() {
    return new SESClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
}

/**
 * Initiate domain verification with AWS SES.
 * Returns { verificationToken, dkimTokens }.
 */
export async function verifyDomain(user) {
    const client = createSesClient();

    // 1. Verify domain identity → get TXT verification token
    const identityRes = await client.send(
        new VerifyDomainIdentityCommand({ Domain: user.domain })
    );
    const verificationToken = identityRes.VerificationToken;

    // 2. Get DKIM tokens
    const dkimRes = await client.send(
        new VerifyDomainDkimCommand({ Domain: user.domain })
    );
    const dkimTokens = dkimRes.DkimTokens || [];

    return { verificationToken, dkimTokens };
}

/**
 * Build the list of DNS records the user needs to add.
 */
export function getDnsRecords(user) {
    const records = [];

    // TXT record for domain verification
    if (user.verificationToken) {
        records.push({
            type: 'TXT',
            name: `_amazonses.${user.domain}`,
            value: user.verificationToken,
            purpose: 'Domain Verification',
        });
    }

    // CNAME records for DKIM
    if (user.dkimTokens && user.dkimTokens.length > 0) {
        user.dkimTokens.forEach((token, i) => {
            records.push({
                type: 'CNAME',
                name: `${token}._domainkey.${user.domain}`,
                value: `${token}.dkim.amazonses.com`,
                purpose: `DKIM Record ${i + 1}`,
            });
        });
    }

    return records;
}

/**
 * Check if the domain has been verified with SES.
 */
export async function checkVerificationStatus(user) {
    const client = createSesClient();

    const res = await client.send(
        new GetIdentityVerificationAttributesCommand({
            Identities: [user.domain],
        })
    );

    const attrs = res.VerificationAttributes?.[user.domain];
    return {
        status: attrs?.VerificationStatus || 'Pending',
        verified: attrs?.VerificationStatus === 'Success',
    };
}

/**
 * Send an email via SES using the user's credentials.
 */
export async function sendEmail({ user, to, subject, body }) {
    const client = createSesClient();

    const params = {
        Source: user.senderEmail,
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
                Html: { Data: body, Charset: 'UTF-8' },
                Text: { Data: body.replace(/<[^>]*>/g, ''), Charset: 'UTF-8' },
            },
        },
    };

    const result = await client.send(new SendEmailCommand(params));
    return { messageId: result.MessageId };
}
