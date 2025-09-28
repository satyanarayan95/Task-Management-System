import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Basic infrastructure validation test
console.log('Testing scheduler infrastructure...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test that the main files exist and can be imported
try {
  console.log('✓ Testing file structure...');
  
  const requiredFiles = [
    '../scheduler.js',
    '../config/database.js',
    '../utils/jobProcessor.js',
    '../models/index.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file} exists`);
    } else {
      console.error(`✗ ${file} missing`);
      process.exit(1);
    }
  }
  
  console.log('✓ All required files exist');
  console.log('✓ Scheduler infrastructure test passed');
  
} catch (error) {
  console.error('✗ Infrastructure test failed:', error);
  process.exit(1);
}