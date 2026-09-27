const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'BotStream_Whitepaper_and_PitchDeck.html');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(3008, '127.0.0.1', () => {
  console.log('BotStream doc server running at http://localhost:3008');
});
