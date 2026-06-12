import fs from 'fs';
import http from 'http';

http.get('http://localhost:4000/api/auth/debug-register', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('debug-result.json', data);
    console.log('Done writing debug-result.json');
  });
}).on('error', (err) => {
  fs.writeFileSync('debug-result.json', JSON.stringify({ error: err.message }));
  console.log('Error writing debug-result.json');
});
