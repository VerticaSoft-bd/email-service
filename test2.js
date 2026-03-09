async function testApi() {
    const urls = [
        'https://api.paystation.com.bd/initiate-payment',
        'https://sandbox.paystation.com.bd/initiate-payment',
        'https://app.paystation.com.bd/api/initiate-payment',
        'https://app.paystation.com.bd/api/payment/create'
    ];

    for (let url of urls) {
        try {
            console.log(`\nTesting URL: ${url}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantId: '104-1653730183',
                    password: 'gamecoderstorepass',
                    invoice_number: 'INV-' + Date.now(),
                    currency: 'BDT',
                    payment_amount: 2900,
                    cust_name: 'test',
                    cust_email: 'test@test.com',
                    cust_phone: '01700000000',
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
