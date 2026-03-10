import PLAN_LIMITS from '../config/limits.js';
import Domain from '../models/Domain.js';
import EmailAccount from '../models/EmailAccount.js';

export const checkDomainLimit = async (req, res, next) => {
    const userPlan = req.user.plan || 'starter';
    const limit = PLAN_LIMITS[userPlan].domains;

    if (limit === -1) return next();

    const domainCount = await Domain.countDocuments({ userId: req.user._id });

    if (domainCount >= limit) {
        return res.status(403).render('dashboard/domains', {
            domains: await Domain.find({ userId: req.user._id }),
            statusMessage: null,
            error: `You have reached the limit of ${limit} domains for your ${userPlan} plan. Please upgrade to add more.`,
        });
    }

    next();
};

export const checkIdentityLimit = async (req, res, next) => {
    const userPlan = req.user.plan || 'starter';
    const limit = PLAN_LIMITS[userPlan].identities;

    if (limit === -1) return next();

    const identityCount = await EmailAccount.countDocuments({ userId: req.user._id });

    if (identityCount >= limit) {
        return res.status(403).render('dashboard/accounts', {
            accounts: await EmailAccount.find({ userId: req.user._id }),
            domains: await Domain.find({ userId: req.user._id, isVerified: true }),
            error: `You have reached the limit of ${limit} email identities for your ${userPlan} plan. Please upgrade to add more.`,
            success: null
        });
    }

    next();
};

export const checkEmailLimit = async (req, res, next) => {
    const userPlan = req.user.plan || 'starter';
    const limit = PLAN_LIMITS[userPlan].emailsPerMonth;

    if (limit === -1) return next();

    const emailsSent = req.user.usage.emailsSent || 0;

    if (emailsSent >= limit) {
         return res.status(403).render('dashboard/send', {
            accounts: await EmailAccount.find({ userId: req.user._id }),
            error: `You have reached the monthly limit of ${limit} emails for your ${userPlan} plan. Please upgrade to send more.`,
            success: null
        });
    }

    next();
};
