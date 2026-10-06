import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { createStorage } from '../services/s3.js';

async function serve(t, storage) {
  const server = createApp(storage).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
function form(name, body, type = 'text/plain') {
  const data = new FormData();
  data.append('file', new Blob([body], { type }), name);
  return data;
}
test('missing AWS configuration starts gracefully and returns actionable errors', async (t) => {
  const base = await serve(t, createStorage({}));
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const cloud = await (await fetch(`${base}/api/cloud/status`)).json();
  assert.equal(cloud.status, 'not_configured');
  const listing = await fetch(`${base}/api/files`);
  assert.equal(listing.status, 503);
  assert.equal((await listing.json()).code, 'NOT_CONFIGURED');
  const upload = await fetch(`${base}/api/files/upload`, {
    method: 'POST',
    body: form('notes.txt', 'hello cloud'),
  });
  assert.equal(upload.status, 503);
});
test('API upload, list, signed URL and delete work through an injected test storage', async (t) => {
  const files = [];
  const storage = {
    list: async () => files,
    status: async () => ({ status: 'connected' }),
    put: async (file, validated) => {
      assert.equal(file.buffer.toString(), 'hello cloud');
      const saved = {
        key: 'test--notes.txt',
        name: validated.name,
        size: file.size,
      };
      files.push(saved);
      return saved;
    },
    url: async (key, download) => {
      assert.equal(key, 'test--notes.txt');
      assert.equal(download, true);
      return { url: 'https://example.com/test-signed-url', expiresIn: 300 };
    },
    remove: async (key) => {
      assert.equal(key, files[0].key);
      files.pop();
    },
  };
  const base = await serve(t, storage);
  const upload = await fetch(`${base}/api/files/upload`, {
    method: 'POST',
    body: form('notes.txt', 'hello cloud'),
  });
  assert.equal(upload.status, 201);
  assert.equal((await upload.json()).file.name, 'notes.txt');
  assert.equal(
    (await (await fetch(`${base}/api/files`)).json()).files.length,
    1,
  );
  const url = await fetch(
    `${base}/api/files/url?key=test--notes.txt&download=true`,
  );
  assert.equal(url.headers.get('cache-control'), 'no-store');
  assert.equal((await url.json()).expiresIn, 300);
  assert.equal(
    (await fetch(`${base}/api/files?key=test--notes.txt`, { method: 'DELETE' }))
      .status,
    200,
  );
  assert.equal(
    (await (await fetch(`${base}/api/files`)).json()).files.length,
    0,
  );
});
test('rejects oversize, unsupported, empty and disguised uploads before writing storage', async (t) => {
  let writes = 0;
  const base = await serve(t, {
    put: async () => {
      writes++;
    },
  });
  for (const [name, body, expected] of [
    ['notes.exe', 'data', 415],
    ['empty.txt', '', 400],
    ['fake.pdf', 'not a PDF', 415],
    ['big.txt', Buffer.alloc(10 * 1024 * 1024 + 1, 65), 413],
  ]) {
    const response = await fetch(`${base}/api/files/upload`, {
      method: 'POST',
      body: form(name, body),
    });
    assert.equal(response.status, expected, name);
  }
  assert.equal(writes, 0);
});
test('rejects unapproved origins and missing object keys; sanitizes AWS errors', async (t) => {
  const base = await serve(t, {
    list: async () => {
      throw new Error('AWS_SECRET_ACCESS_KEY=must-never-leak');
    },
  });
  assert.equal(
    (
      await fetch(`${base}/api/files`, {
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(`${base}/api/files/url`)).status, 400);
  assert.equal(
    (await fetch(`${base}/api/files`, { method: 'DELETE' })).status,
    400,
  );
  const response = await fetch(`${base}/api/files`);
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('must-never-leak'));
});
