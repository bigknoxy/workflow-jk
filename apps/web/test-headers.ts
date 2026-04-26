/**
 * Test script to verify API headers are correctly sent
 * Run: bun test-header.ts
 */

import { createServer } from 'http';

const server = createServer((req, res) => {
  // Read headers and log them
  const headersToLog: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(req.headers)) {
    if (value && typeof value === 'string') {
      headersToLog[key] = value;
    }
  }
  
  console.log('\n--- Incoming Request Headers ---');
  console.log('Path:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(headersToLog, null, 2));
  console.log('--- End Headers ---\n');
  
  // Send a simple response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Header test successful',
    receivedHeaders: headersToLog,
  }));
});

// Start server on port 3001 (simulated backend)
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\nTest server started on port ${PORT}`);
  console.log('This simulates a backend to verify headers are sent correctly.\n');
  console.log('To test:');
  console.log('1. Start the Next.js dev server: bun run dev');
  console.log('2. Navigate to any page in the browser');
  console.log('3. Check this terminal for received headers');
  console.log('4. Look for: X-Organization-Id, X-Session-Id, X-Actor, X-Role\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nShutting down test server...');
  server.close(() => {
    console.log('Test server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  server.close(() => {
    console.log('Test server closed.');
    process.exit(0);
  });
});
