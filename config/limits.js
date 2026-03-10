const PLAN_LIMITS = {
    starter: {
        domains: 1,
        identities: 5,
        emailsPerMonth: 100,
    },
    pro: {
        domains: 5,
        identities: -1, // Unlimited
        emailsPerMonth: 10000,
    },
    scale: {
        domains: -1, // Unlimited
        identities: -1, // Unlimited
        emailsPerMonth: 50000,
    }
};

export default PLAN_LIMITS;
