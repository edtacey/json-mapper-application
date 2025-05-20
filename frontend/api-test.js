// Simple test script to verify frontend-backend connectivity
const axios = require('axios');

// Set up axios instance similar to the one in the frontend
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test API endpoints
async function testAPI() {
  try {
    console.log('Testing backend API connectivity...');
    
    // 1. Test health endpoint
    const healthResponse = await axiosInstance.get('/health');
    console.log('Health check:', healthResponse.data);
    
    // 2. Test entities endpoint
    const entitiesResponse = await axiosInstance.get('/entities');
    console.log('Entities count:', entitiesResponse.data.entities.length);
    console.log('First entity name:', entitiesResponse.data.entities[0]?.name || 'No entities found');
    
    console.log('\nAPI connectivity test successful!');
    console.log('The frontend preview server should be able to connect to the backend.');
    
  } catch (error) {
    console.error('API connectivity test failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();