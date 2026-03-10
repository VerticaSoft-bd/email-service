import { Router } from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';

const router = Router();

// Pricing Details Map
const PLAN_DETAILS = {
    'pro': { amount: 599, name: 'Professional Plan' },
    'scale': { amount: 1999, name: 'Scale Plan' }
};

// GET Billing Dashboard
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.render('dashboard/billing', { orders });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// POST Initiate Checkout via PayStation
router.post('/checkout', async (req, res) => {
    try {
        const { plan } = req.body;

        if (!PLAN_DETAILS[plan]) {
            return res.status(400).send("Invalid Plan");
        }

        const invoice_number = 'INV-' + Date.now();
        const amount = PLAN_DETAILS[plan].amount; // Amount in BDT/USD as expected

        // Create Pending Order
        const newOrder = new Order({
            userId: req.user._id,
            plan,
            amount,
            invoice_number,
            status: 'pending'
        });
        await newOrder.save();

        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'}/dashboard/billing/callback`;
        const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000'}/dashboard/billing/cancel`;

        // PayStation Create Payment API payload
        const payload = {
            merchantId: process.env.PAYSTATION_MERCHANT_ID,
            password: process.env.PAYSTATION_PASSWORD,
            invoice_number,
            currency: 'BDT',
            payment_amount: amount,
            cust_name: req.user.name || 'User',
            cust_email: req.user.email,
            cust_phone: '01700000000', // Mock/Placeholder unless user schema has phone
            callback_url: callbackUrl,
            cancel_url: cancelUrl,
        };

        const paystationUrl = `${process.env.PAYSTATION_API_URL}/initiate-payment`;

        const response = await fetch(paystationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Check if PayStation returned a payment_url
        if (data && data.status === 'success' && data.payment_url) {
            return res.redirect(data.payment_url);
        } else {
            console.error("PayStation API Error:", data);
            return res.status(500).send("Could not initialize payment with Gateway.");
        }

    } catch (err) {
        console.error("Checkout Error:", err);
        return res.status(500).send("An error occurred during checkout.");
    }
});

// GET/POST Callback (IPN / Return URL)
router.all('/callback', async (req, res) => {
    try {
        // PayStation typically sends back query params like ?invoice_number=INV-XXXX&status=success&trx_id=XXXX
        // We use req.query for GET results, or req.body for POST-based IPNs
        const { invoice_number, status, trx_id } = req.method === 'POST' ? req.body : req.query;

        console.log(`[Billing] Callback received - Invoice: ${invoice_number}, Status: ${status}, TrxID: ${trx_id}`);

        if (!invoice_number) {
            console.error("[Billing] Error: Missing invoice_number in callback");
            return res.redirect('/dashboard/billing');
        }

        const order = await Order.findOne({ invoice_number });

        if (!order) {
            console.error(`[Billing] Error: Order not found for invoice: ${invoice_number}`);
            return res.send("Order not found.");
        }

        // Standardizing status check to be case-insensitive and handle 'success' or 'Successful'
        const normalizedStatus = status ? status.toLowerCase() : '';
        const isSuccess = normalizedStatus === 'success' || normalizedStatus === 'successful';

        if (isSuccess) {
            order.status = 'completed';
            order.trxId = trx_id;
            await order.save();

            // Upgrade User Plan
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 Month validity

            const updatedUser = await User.findByIdAndUpdate(order.userId, {
                plan: order.plan,
                subscriptionExpiry: expiryDate
            }, { new: true });

            console.log(`[Billing] Plan activated for user ${order.userId}: ${order.plan}`);

            return res.redirect('/dashboard/billing?success=PaymentSuccessful');
        } else {
            console.warn(`[Billing] Payment failed for invoice: ${invoice_number}. Status: ${status}`);
            order.status = 'failed';
            await order.save();
            return res.redirect('/dashboard/billing?error=PaymentFailed');
        }

    } catch (err) {
        console.error("[Billing] Callback Error:", err);
        res.redirect('/dashboard/billing');
    }
});

// GET Cancel
router.get('/cancel', async (req, res) => {
    res.redirect('/dashboard/billing?error=PaymentCancelled');
});

// GET Invoice
router.get('/invoice/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
        if (!order) {
            return res.status(404).send('Invoice not found');
        }
        res.render('dashboard/invoice', { order, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading invoice');
    }
});

export default router;
