/**
 * Test script for OCR microservice integration
 * Tests the complete flow: authentication -> OCR processing -> English word extraction
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://niknruuooktjotwydlqa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OCR_SERVICE_URL = 'http://localhost:8001';
const API_URL = 'http://localhost:3000';

async function testOcrFlow() {
  console.log('=== OCR Integration Test ===\n');

  // Step 1: Test OCR service health
  console.log('1. Testing OCR service health...');
  try {
    const healthRes = await fetch(`${OCR_SERVICE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('   ✓ OCR Service:', healthData.status);
  } catch (err) {
    console.error('   ✗ OCR service not reachable:', err.message);
    process.exit(1);
  }

  // Step 2: Create or get a test teacher user
  console.log('\n2. Setting up test teacher account...');
  const testEmail = `ocr.test.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Create user directly via admin API with email confirmation bypass
    const { data: adminData, error: adminError } = await supabaseRequest('POST', '/auth/v1/admin/users', {
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'teacher',
        full_name: 'OCR Test Teacher'
      }
    }, true);

    if (adminError && !adminError.includes('already registered')) {
      console.error('   ✗ User creation error:', adminError);
      process.exit(1);
    }

    const userId = adminData.id;
    console.log('   ✓ Created/tested test teacher:', testEmail);
    console.log('   ✓ User ID:', userId);

    // Add to teacher allowlist (using service role key which bypasses RLS)
    console.log('   Adding email to teacher_allowlist...');
    const allowlistRes = await fetch(`${SUPABASE_URL}/rest/v1/teacher_allowlist`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        email: testEmail
      })
    });

    if (!allowlistRes.ok) {
      const errorText = await allowlistRes.text();
      console.error('   ✗ Failed to add to allowlist:', allowlistRes.status, errorText);
      process.exit(1);
    }

    console.log('   ✓ Added to teacher_allowlist');

    // Sign in as the new user to get their JWT (not service role)
    console.log('   Signing in as new user to insert their own record...');
    const { data: userSignInData, error: userSignInError } = await supabaseRequest('POST', '/auth/v1/token?grant_type=password', {
      email: testEmail,
      password: testPassword
    });

    if (userSignInError) {
      console.error('   ✗ User sign in error:', userSignInError);
      process.exit(1);
    }

    const userJwtToken = userSignInData.access_token;
    console.log('   ✓ Got user JWT token (first 20 chars):', userJwtToken.substring(0, 20) + '...');

    // Insert into users table with teacher role (using user's own JWT)
    console.log('   Inserting user record into users table...');
    const insertHeaders = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${userJwtToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: insertHeaders,
      body: JSON.stringify({
        uid: userId,
        role: 'teacher',
        class_code: null,
        display_name: 'OCR Test Teacher',
        email: testEmail
      })
    });

    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      console.error('   ✗ Failed to insert user record:', insertRes.status, errorText);
      process.exit(1);
    }

    console.log('   ✓ User record inserted into users table');

    // Sign in to get JWT token using password grant
    const { data: signInData, error: signInError } = await supabaseRequest('POST', '/auth/v1/token?grant_type=password', {
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('   ✗ Sign in error:', signInError);
      process.exit(1);
    }

    const jwtToken = signInData.access_token;
    console.log('   ✓ Got JWT token (first 20 chars):', jwtToken.substring(0, 20) + '...');

    // Step 3: Test OCR endpoint with authentication
    console.log('\n3. Testing OCR endpoint with authentication...');

    // Find a test image
    const testImagePath = path.join(__dirname, 'docs/screenshots/a11y-final.png');
    if (!fs.existsSync(testImagePath)) {
      console.error('   ✗ Test image not found:', testImagePath);
      process.exit(1);
    }
    console.log('   ✓ Found test image:', testImagePath);

    // Prepare form data with image
    const form = new FormData();
    const imageBuffer = fs.readFileSync(testImagePath);
    form.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'test.png');

    // Call OCR endpoint
    const ocrRes = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: form
    });

    const ocrResult = await ocrRes.json();

    if (!ocrRes.ok) {
      console.error('   ✗ OCR request failed:', ocrResult);
      process.exit(1);
    }

    console.log('   ✓ OCR successful!');
    console.log('   📝 Extracted words:', ocrResult.words);
    console.log('   📄 Raw text preview:', ocrResult.raw_text.substring(0, 100) + '...');
    console.log('\n=== Test Complete ===');
    console.log('✓ All services working correctly!');
    console.log(`✓ Extracted ${ocrResult.words.length} English words from test image`);

  } catch (err) {
    console.error('   ✗ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

async function supabaseRequest(method, path, body, useBearerToken = false) {
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  };

  if (useBearerToken) {
    headers['Authorization'] = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    return { data: null, error: data.message || data.error_description || JSON.stringify(data) };
  }

  return { data, error: null };
}

// Run the test
testOcrFlow().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
