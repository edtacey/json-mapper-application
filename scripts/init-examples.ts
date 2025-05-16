#!/usr/bin/env ts-node

import { createExampleData } from '../src/utils/examples';
import { DataStore } from '../src/storage/data-store';
import * as path from 'path';
import * as fs from 'fs';

async function initializeExampleData() {
  console.log('Initializing example data...');
  
  const dataDir = path.join(__dirname, '../data');
  
  // Ensure data directories exist
  const directories = [
    path.join(dataDir, 'entities'),
    path.join(dataDir, 'mappings'),
    path.join(dataDir, 'value-mappings')
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Create data stores
  const entityStore = new DataStore(path.join(dataDir, 'entities'));
  const mappingStore = new DataStore(path.join(dataDir, 'mappings'));
  const valueMappingStore = new DataStore(path.join(dataDir, 'value-mappings'));
  
  // Get example data
  const { entities, mappings, valueMappings } = createExampleData();
  
  // Save entities
  for (const entity of entities) {
    await entityStore.save(entity);
    console.log(`Created entity: ${entity.name}`);
  }
  
  // Save mappings
  for (const mapping of mappings) {
    await mappingStore.save(mapping);
    console.log(`Created mapping: ${mapping.source} -> ${mapping.target}`);
  }
  
  // Save value mappings
  for (const valueMapping of valueMappings) {
    await valueMappingStore.save(valueMapping);
    console.log(`Created value mapping: ${valueMapping.name}`);
  }
  
  console.log('\nExample data initialized successfully!');
  console.log(`- ${entities.length} entities`);
  console.log(`- ${mappings.length} mappings`);
  console.log(`- ${valueMappings.length} value mappings`);
}

// Run if executed directly
if (require.main === module) {
  initializeExampleData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error initializing example data:', error);
      process.exit(1);
    });
}

export { initializeExampleData };
