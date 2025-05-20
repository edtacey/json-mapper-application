// API validation script that mimics the frontend's API setup

const axios = require('axios');

// Define the API URL (same as in the React frontend)
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

console.log('Testing API connection to:', API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test both the health and entities endpoints
async function testConnection() {
  try {
    // Test the health endpoint
    const healthResponse = await axiosInstance.get('/health');
    console.log('✅ Health check successful:', healthResponse.data);
    
    // Test the entities endpoint
    const entitiesResponse = await axiosInstance.get('/entities');
    console.log(`✅ Entities endpoint successful: Retrieved ${entitiesResponse.data.entities.length} entities`);
    
    if (entitiesResponse.data.entities.length > 0) {
      const entity = entitiesResponse.data.entities[0];
      console.log('First entity details:');
      console.log(`  - ID: ${entity.id}`);
      console.log(`  - Name: ${entity.name}`);
      console.log(`  - Has upsertConfig: ${entity.upsertConfig ? 'Yes' : 'No'}`);
    }
    
    console.log('\n✨ Connection validation complete! The frontend can communicate with the backend API.');
    console.log('This confirms that the Vite-served frontend can access the backend when running in preview mode.');
    
  } catch (error) {
    console.error('❌ API Connection test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testConnection();