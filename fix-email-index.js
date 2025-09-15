// Fix email index script
const axios = require('axios');

async function fixEmailIndex() {
  try {
    console.log('🔧 Calling fix-email-index endpoint...');
    
    const response = await axios.post('https://inno-backend-y1bv.onrender.com/api/admin/fix-email-index');
    
    console.log('✅ Success:', response.data);
    console.log('📋 Results:', JSON.stringify(response.data.results, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

fixEmailIndex();