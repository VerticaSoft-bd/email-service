async function testApi() {
    const urls = [
        'https://api.paystation.com.bd/v1/payment/create',
        'https://sandbox.paystation.com.bd/api/v1/payment/create',
        'https://sandbox.paystation.com.bd/payment/create',
        'https://sandbox.paystation.com.bd/auth/payment/create'
    ];

    for (let url of urls) {
        try {
            console.log(`Testing URL: ${url}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: '104-1653730183',
                    password: 'gamecoderstorepass',
                    invoice_number: 'INV-' + Date.now(),
                    amount: 2900,
                    customer_name: 'test',
                    customer_email: 'test@test.com',
                    customer_phone: '01700000000',
                    callback_url: 'http://localhost:3000/success',
                    cancel_url: 'http://localhost:3000/cancel',
                })
            });
            const data = await res.text();
            console.log("Status:", res.status);
            console.log("Data snippet:", data.substring(0, 150));
            console.log("-----------------------");
        } catch (err) {
            console.error(err);
        }
    }
}
testApi();
