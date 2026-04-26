const axios = require('axios');

async function testUpdate() {
  const url = 'http://localhost:3000/orders/L7LB3X/status';
  const payload = { booking_status: 'accepted' };
  
  try {
    console.log('Sending PATCH to:', url);
    console.log('Payload:', payload);
    const res = await axios.patch(url, payload);
    console.log('Response:', res.data);
    
    // Wait 2 seconds and check status
    console.log('Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));
    
    // I can't check the DB from here easily since I don't have the creds in this script
    // but I can use my other script.
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testUpdate();
