#!/usr/bin/env node

/**
 * Pre-commit test script for YAML/JSON schema and entity linking features
 *
 * This script tests:
 * 1. Schema format conversion (JSON ↔ YAML)
 * 2. Entity abstraction flags
 * 3. Entity linking functionality
 * 4. API endpoint validation
 *
 * Usage:
 *   node test-schema-features.js
 *
 * Returns:
 *   Exit code 0 if all tests pass, non-zero otherwise
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;
const chalk = require('chalk') || { green: (t) => t, red: (t) => t, yellow: (t) => t };

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_DATA_DIR = path.join(__dirname, '../test-data');

// Ensure test data directory exists
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

// Test utilities
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

// Helper for test result tracking
function trackTest(name, passed, error = null) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(chalk.green(`✓ ${name}`));
  } else {
    failedTests.push({ name, error });
    console.log(chalk.red(`✗ ${name}`));
    if (error) {
      console.log(chalk.red(`  Error: ${error.message || error}`));
    }
  }
}

// Sample test data
const sampleEntity = {
  name: "TestEntity",
  description: "Entity for testing schema features",
  samplePayload: {
    id: "test-123",
    name: "Test Object",
    properties: {
      stringProp: "test value",
      numberProp: 42,
      booleanProp: true,
      objectProp: {
        nestedValue: "nested"
      },
      arrayProp: [1, 2, 3]
    },
    createdAt: "2025-05-16T00:00:00Z"
  }
};

// Sample data for negative tests
const invalidEntity = {
  // Missing required name
  description: "Invalid entity",
  samplePayload: { id: "invalid" }
};

// ---- Test Functions -----

async function testEntityCreation(entityData) {
  try {
    const response = await api.post('/entities/generate', {
      samplePayload: entityData.samplePayload,
      entityName: entityData.name,
      description: entityData.description,
      schemaFormat: 'json',
      inboundAbstracted: false,
      outboundAbstracted: false
    });
    
    assert.strictEqual(response.data.success, true);
    assert.ok(response.data.entity.id);
    
    // Save entity ID for later tests
    const entityId = response.data.entity.id;
    fs.writeFileSync(path.join(TEST_DATA_DIR, 'test-entity-id.txt'), entityId);
    
    trackTest('Entity Creation', true);
    return entityId;
  } catch (error) {
    trackTest('Entity Creation', false, error);
    throw error;
  }
}

async function testInvalidEntityCreation() {
  try {
    await api.post('/entities/generate', {
      samplePayload: invalidEntity.samplePayload,
      // Missing entityName
      description: invalidEntity.description
    });
    
    // If we get here, the test failed (should have thrown an error)
    trackTest('Invalid Entity Creation (Negative Test)', false, 
      new Error('API accepted invalid entity without required name'));
  } catch (error) {
    // Expected error, test passes
    trackTest('Invalid Entity Creation (Negative Test)', true);
  }
}

async function testSchemaFormatToggle(entityId) {
  try {
    // Change format to YAML
    const yamlResponse = await api.put(`/entities/${entityId}/schema-format`, {
      schemaFormat: 'yaml'
    });
    
    assert.strictEqual(yamlResponse.data.success, true);
    assert.strictEqual(yamlResponse.data.entity.schemaFormat, 'yaml');
    
    // Change back to JSON
    const jsonResponse = await api.put(`/entities/${entityId}/schema-format`, {
      schemaFormat: 'json'
    });
    
    assert.strictEqual(jsonResponse.data.success, true);
    assert.strictEqual(jsonResponse.data.entity.schemaFormat, 'json');
    
    trackTest('Schema Format Toggle', true);
  } catch (error) {
    trackTest('Schema Format Toggle', false, error);
  }
}

async function testInvalidSchemaFormat(entityId) {
  try {
    await api.put(`/entities/${entityId}/schema-format`, {
      schemaFormat: 'invalid-format' // Invalid format
    });
    
    // If we get here, the test failed
    trackTest('Invalid Schema Format (Negative Test)', false, 
      new Error('API accepted invalid schema format'));
  } catch (error) {
    // Expected error, test passes
    trackTest('Invalid Schema Format (Negative Test)', true);
  }
}

async function testAbstractionFlags(entityId) {
  try {
    // Set inbound abstraction
    const inboundResponse = await api.put(`/entities/${entityId}/schema-format`, {
      inboundAbstracted: true
    });
    
    assert.strictEqual(inboundResponse.data.success, true);
    assert.strictEqual(inboundResponse.data.entity.inboundAbstracted, true);
    
    // Set outbound abstraction
    const outboundResponse = await api.put(`/entities/${entityId}/schema-format`, {
      outboundAbstracted: true
    });
    
    assert.strictEqual(outboundResponse.data.success, true);
    assert.strictEqual(outboundResponse.data.entity.outboundAbstracted, true);
    
    trackTest('Abstraction Flags', true);
  } catch (error) {
    trackTest('Abstraction Flags', false, error);
  }
}

async function testEntitySelfLinking(entityId) {
  try {
    // Create self-reference link
    const linkResponse = await api.post(`/entities/${entityId}/link`, {
      targetEntityId: entityId,
      direction: 'outbound',
      linkType: 'reference'
    });
    
    assert.strictEqual(linkResponse.data.success, true);
    assert.ok(linkResponse.data.entity.metadata.linkedEntities);
    assert.strictEqual(linkResponse.data.entity.metadata.linkedEntities.length, 1);
    
    // Check links list
    const linksResponse = await api.get(`/entities/${entityId}/links`);
    assert.strictEqual(linksResponse.data.success, true);
    assert.strictEqual(linksResponse.data.linkedEntities.length, 1);
    
    // Unlink
    const unlinkResponse = await api.delete(`/entities/${entityId}/link/${entityId}/outbound`);
    assert.strictEqual(unlinkResponse.data.success, true);
    assert.strictEqual(unlinkResponse.data.entity.metadata.linkedEntities.length, 0);
    
    trackTest('Entity Self-Linking', true);
  } catch (error) {
    trackTest('Entity Self-Linking', false, error);
  }
}

async function testInvalidLinking(entityId) {
  try {
    // Try to link to non-existent entity
    await api.post(`/entities/${entityId}/link`, {
      targetEntityId: 'non-existent-entity-id',
      direction: 'inbound',
      linkType: 'reference'
    });
    
    // If we get here, the test failed
    trackTest('Invalid Entity Link (Negative Test)', false, 
      new Error('API accepted link to non-existent entity'));
  } catch (error) {
    // Expected error, test passes
    trackTest('Invalid Entity Link (Negative Test)', true);
  }
}

async function testInvalidLinkDirection(entityId) {
  try {
    // Try invalid direction
    await api.post(`/entities/${entityId}/link`, {
      targetEntityId: entityId,
      direction: 'invalid-direction',
      linkType: 'reference'
    });
    
    // If we get here, the test failed
    trackTest('Invalid Link Direction (Negative Test)', false, 
      new Error('API accepted invalid link direction'));
  } catch (error) {
    // Expected error, test passes
    trackTest('Invalid Link Direction (Negative Test)', true);
  }
}

async function cleanupTestEntity(entityId) {
  try {
    if (entityId) {
      // Delete test entity
      const response = await api.delete(`/entities/${entityId}`);
      assert.strictEqual(response.data.success, true);
      console.log(chalk.yellow(`Test entity ${entityId} cleaned up`));
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

// ----- Main test execution -----

async function runTests() {
  console.log(chalk.yellow('Starting Schema Features Tests...'));
  console.log('-------------------------------------');
  
  let entityId = null;
  
  try {
    // Create test entity
    entityId = await testEntityCreation(sampleEntity);
    
    // Run tests that require a valid entity
    if (entityId) {
      await Promise.all([
        testInvalidEntityCreation(),
        testSchemaFormatToggle(entityId),
        testInvalidSchemaFormat(entityId),
        testAbstractionFlags(entityId),
        testEntitySelfLinking(entityId),
        testInvalidLinking(entityId),
        testInvalidLinkDirection(entityId)
      ]);
    }
  } catch (error) {
    console.error(chalk.red('Test suite error:'), error);
  } finally {
    // Clean up
    await cleanupTestEntity(entityId);
    
    // Report results
    console.log('-------------------------------------');
    console.log(chalk.yellow(`Test Summary: ${passedTests}/${totalTests} tests passed`));
    
    if (failedTests.length > 0) {
      console.log(chalk.red('\nFailed Tests:'));
      failedTests.forEach(test => {
        console.log(chalk.red(`- ${test.name}`));
      });
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll tests passed!'));
      process.exit(0);
    }
  }
}

// Run tests
runTests();