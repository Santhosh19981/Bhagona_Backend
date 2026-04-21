const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: 'rzp_test_SgBxmI3d2kzrUL',
    key_secret: 'C18RjQDbYsbfK0M86AJv3d4b'
});

async function testOrder() {
    try {
        const order = await razorpay.orders.create({
            amount: 22000, // 220 INR
            currency: 'INR',
            receipt: 'test_rcpt_' + Date.now()
        });
        console.log('SUCCESS:', order);
    } catch (err) {
        console.error('FAILURE:', err);
    }
}

testOrder();
