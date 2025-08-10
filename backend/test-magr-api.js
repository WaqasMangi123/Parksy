// test-magr-api.js - Simple test script
require('dotenv').config();
const axios = require('axios');

async function testMagrAPI() {
  console.log('🧪 Testing MAGR API directly...');
  
  const credentials = {
    user_email: process.env.MAGR_USER_EMAIL || 'demob2b@gmail.com',
    password: process.env.MAGR_PASSWORD || 'P8aD#VD%sCH?lm~9',
    agent_code: process.env.MAGR_AGENT_CODE || '6vW2Ug0rUMAQAcPLmNfBSAVYPENg'
  };
  
  console.log('📋 Using credentials:');
  console.log('Email:', credentials.user_email);
  console.log('Password:', credentials.password);
  console.log('Agent Code:', credentials.agent_code);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 8);
  
  const requestData = {
    ...credentials,
    quote: {
      airport_code: "LHR",
      dropoff_date: tomorrow.toISOString().split('T')[0],
      dropoff_time: "09:00",
      pickup_date: nextWeek.toISOString().split('T')[0],
      pickup_time: "18:00"
    }
  };
  
  console.log('\n📦 Request data:');
  console.log(JSON.stringify(requestData, null, 2));
  
  try {
    console.log('\n🚀 Making POST request to: https://api.magrgroup.com/public/api/products');
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.magrgroup.com/public/api/products',
      data: requestData,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      },
      timeout: 30000,
      maxRedirects: 0
    });
    
    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ ERROR!');
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received');
      console.log('Request config:', error.config);
    } else {
      console.log('Request setup error:', error.message);
    }
  }
}

// Run the test
testMagrAPI().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});