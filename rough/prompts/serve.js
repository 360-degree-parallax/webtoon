'use strict';

const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { compile, references } = require('./compile.js');

const directory = '/rough/prompts/';
const files = new Map([
  [directory, ['index.html', 'text/html; charset=utf-8']],
  [directory + 'app.js', ['app.js', 'text/javascript; charset=utf-8']],
  [directory + 'style.css', ['style.css', 'text/css; charset=utf-8']],
  ...references.map(ref => [ref.image, ['..' + ref.image.slice('/rough'.length), 'image/png']]),
]);
const maxRequest = 768 * 1024;

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(body);
}

const json = (res, status, body) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(body));

function createApp() {
  return createServer(async (req, res) => {
    const port = req.socket.localPort;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(req.headers.host))
      return json(res, 403, { error: '러프 프롬프트는 로컬 주소에서만 열 수 있어요.' });
    const path = req.url.split('?')[0];
    if (req.method === 'GET') {
      if (path === '/' || path === '/rough/prompts') {
        res.writeHead(302, { Location: directory }).end();
        return;
      }
      if (path === directory + 'api/references') return json(res, 200, references);
      const file = files.get(path);
      if (!file) return json(res, 404, { error: '페이지를 찾을 수 없어요.' });
      try {
        return send(res, 200, file[1], await readFile(join(__dirname, file[0])));
      } catch {
        return json(res, 404, { error: '파일을 찾을 수 없어요.' });
      }
    }
    if (req.method !== 'POST' || path !== directory + 'api/compile')
      return json(res, 404, { error: '요청 경로를 찾을 수 없어요.' });
    if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)
      return json(res, 403, { error: '다른 주소에서 보낸 요청은 처리할 수 없어요.' });
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json')
      return json(res, 415, { error: '장면 정보는 JSON으로 보내주세요.' });
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > maxRequest) {
          res.setHeader('Connection', 'close');
          return json(res, 413, { error: '장면 입력 용량이 너무 커요.' });
        }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks, size));
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('입력을 확인해주세요.');
      return json(res, 200, compile(input));
    } catch (error) {
      return json(res, 400, { error: error instanceof SyntaxError ? '입력 형식을 확인해주세요.' : error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.argv[2] ?? 8002);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('사용법: node rough/prompts/serve.js [포트]');
    process.exitCode = 1;
  } else {
    const server = createApp();
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`러프 프롬프트: http://127.0.0.1:${port}${directory}`));
  }
}

module.exports = { createApp };
