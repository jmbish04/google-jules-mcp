#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Test the Jules MCP server
async function testJulesMCP() {
  console.log('Testing Google Jules MCP Server...');
  
  // Test requests
  const testRequests = [
    {
      name: 'List Tools',
      request: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }
    },
    {
      name: 'List Resources',
      request: {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {}
      }
    },
    {
      name: 'Read Task Schema',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/read',
        params: {
          uri: 'jules://schemas/task'
        }
      }
    },
    {
      name: 'List Tasks (Test)',
      request: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'jules_list_tasks',
          arguments: {
            status: 'all',
            limit: 5
          }
        }
      }
    },
    {
      name: 'Session Info (Test)',
      request: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'jules_session_info',
          arguments: {}
        }
      }
    }
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HEADLESS: 'true',
        DEBUG: 'true'
      }
    });

    let currentTest = 0;
    let responses = [];

    child.stdout.on('data', (data) => {
      const response = data.toString().trim();
      if (response) {
        try {
          const parsed = JSON.parse(response);
          responses.push({
            test: testRequests[currentTest - 1]?.name,
            response: parsed
          });
          console.log(`✓ ${testRequests[currentTest - 1]?.name}: Success`);
        } catch (e) {
          console.log(`Response: ${response}`);
        }
      }
    });

    child.stderr.on('data', (data) => {
      console.log(`Server: ${data.toString().trim()}`);
    });

    child.on('error', (error) => {
      console.error('Error starting server:', error);
      reject(error);
    });

    // Send test requests
    function sendNextRequest() {
      if (currentTest < testRequests.length) {
        const test = testRequests[currentTest];
        console.log(`\nTesting: ${test.name}`);
        child.stdin.write(JSON.stringify(test.request) + '\n');
        currentTest++;
        setTimeout(sendNextRequest, 2000);
      } else {
        setTimeout(() => {
          child.kill();
          resolve(responses);
        }, 3000);
      }
    }

    setTimeout(sendNextRequest, 2000);
  });
}

// Run tests
testJulesMCP()
  .then((responses) => {
    console.log('\n=== Test Results ===');
    responses.forEach((r, i) => {
      console.log(`${i + 1}. ${r.test}:`, r.response.result ? '✓' : r.response.error ? '✗' : '?');
      if (r.response.error) {
        console.log(`   Error: ${r.response.error.message}`);
      }
    });
    console.log('\nGoogle Jules MCP testing completed!');
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });