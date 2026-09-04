const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const publicDir = path.join(__dirname, '..', 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API endpoints mock
  if (pathname === '/api/content') {
    const docsList = path.join(publicDir, 'docs_list.json');
    if (fs.existsSync(docsList)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(docsList));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('[]');
  }

  if (pathname === '/api/docs_list') {
    const docsList = path.join(publicDir, 'docs_list.json');
    if (fs.existsSync(docsList)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(docsList));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('[]');
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(publicDir, pathname);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[+] Local preview server running at http://127.0.0.1:${PORT}/`);
});
