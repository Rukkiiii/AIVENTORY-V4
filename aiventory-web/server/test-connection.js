// Quick test script to verify backend is accessible
import http from 'http';

const PORT = process.env.PORT || 5001;

const testURL = `http://localhost:${PORT}/api/suppliers`;

console.log('🧪 Testing backend connection...');
console.log(`📍 URL: ${testURL}\n`);

const req = http.get(testURL, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Backend is running and accessible!');
      console.log(`📦 Response: ${data.substring(0, 100)}...`);
    } else {
      console.log(`⚠️ Backend responded with status: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Backend is NOT running or not accessible!');
  console.error(`   Error: ${error.message}`);
  console.error(`\n💡 Solution: Start the backend with:`);
  console.error(`   cd server && npm start`);
});

req.setTimeout(5000, () => {
  console.error('❌ Connection timeout!');
  console.error('   Backend might not be running on port', PORT);
  req.destroy();
});

