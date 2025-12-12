console.log('Starting SevaDaan NGO Backend...');
console.log('Working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Simple HTTP server test
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/json' });
  res.end(JSON.stringify({
    message: 'SevaDaan Backend is running!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
