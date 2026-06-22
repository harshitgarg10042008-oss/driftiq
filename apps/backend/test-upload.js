const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    const form = new FormData();
    // Use an existing file to test
    form.append('file', fs.createReadStream('package.json'));
    
    console.log('Sending request to /api/files/upload...');
    // Note: We need a valid JWT token, but even without it we should get a 401 Unauthorized, NOT a 500.
    const response = await axios.post('http://localhost:4000/api/files/upload', form, {
      headers: { ...form.getHeaders() }
    });
    console.log('Response:', response.status);
  } catch (err) {
    if (err.response) {
      console.log('Error status:', err.response.status);
      console.log('Error body:', err.response.data);
    } else {
      console.log('Network error:', err.message);
    }
  }
}
test();
