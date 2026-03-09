import fetch from 'node-fetch';

async function testApi() {
    const url = 'https://sandbox.paystation.com.bd/payment/create';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchant_id: '104-1653730183',
                password: 'gamecoderstorepass',
                amount: 2900,
                invoice_number: 'INV-' + Date.now(),
                customer_name: 'test',
                customer_email: 'test@test.com',
                customer_phone: '01700000000',
                callback_url: 'http://localhost:3000/success',
                cancel_url: 'http://localhost:3000/cancel',
            })
        });
        const data = await res.text();
        console.log("Response:", res.status, data);
    } catch (err) {
        console.error(err);
    }
}
testApi();
