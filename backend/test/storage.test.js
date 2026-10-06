import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, displayName } from '../services/s3.js';
import { sanitizeName, validateFile } from '../middleware/upload.js';
const config = {
  region: 'us-east-1',
  bucket: 'test-private-bucket',
  accessKeyId: 'test-only',
  secretAccessKey: 'test-only',
};
test('S3 list traverses every page and keeps nested keys intact', async () => {
  const calls = [];
  const storage = createStorage(config, {
    send: async (command) => {
      calls.push(command.input);
      return calls.length === 1
        ? {
            Contents: [
              { Key: 'folder/', Size: 0 },
              {
                Key: 'folder/a.txt',
                Size: 12,
                LastModified: new Date('2026-01-01'),
              },
            ],
            IsTruncated: true,
            NextContinuationToken: 'next',
          }
        : {
            Contents: [
              { Key: 'b.pdf', Size: 35, LastModified: new Date('2026-02-01') },
            ],
            IsTruncated: false,
          };
    },
  });
  const files = await storage.list();
  assert.equal(files.length, 2);
  assert.equal(calls[1].ContinuationToken, 'next');
  assert.equal(files[0].name, 'b.pdf');
  assert.equal(files[1].key, 'folder/a.txt');
  assert.equal(
    files.reduce((sum, f) => sum + f.size, 0),
    47,
  );
});
test('unique S3 uploads, encryption and five-minute private URL commands', async () => {
  const commands = [];
  const client = {
    send: async (command) => {
      commands.push(command);
      return {};
    },
  };
  const storage = createStorage(
    config,
    client,
    async (received, command, options) => {
      assert.equal(received, client);
      assert.equal(command.constructor.name, 'GetObjectCommand');
      assert.ok(
        command.input.ResponseContentDisposition.startsWith('attachment;'),
      );
      assert.equal(options.expiresIn, 300);
      return 'https://example.com/test-url';
    },
  );
  const file = {
    buffer: Buffer.from('hello'),
    size: 5,
    originalname: '../notes.txt',
  };
  const validated = validateFile(file);
  const first = await storage.put(file, validated),
    second = await storage.put(file, validated);
  assert.notEqual(first.key, second.key);
  assert.equal(displayName(first.key), 'notes.txt');
  assert.equal(commands[0].input.ServerSideEncryption, 'AES256');
  assert.equal(commands[0].input.ContentType, 'text/plain');
  await storage.url(first.key, true);
  assert.equal(commands[2].constructor.name, 'HeadObjectCommand');
  await storage.remove(first.key);
  assert.equal(commands[3].constructor.name, 'DeleteObjectCommand');
});
test('connection status comes from S3 response and credentials are never returned', async () => {
  const disconnected = await createStorage(config, {
    send: async () => {
      throw new Error('private SDK detail');
    },
  }).status();
  assert.equal(disconnected.status, 'disconnected');
  assert.ok(!JSON.stringify(disconnected).includes('private SDK detail'));
  const connected = await createStorage(config, {
    send: async () => ({}),
  }).status();
  assert.equal(connected.status, 'connected');
  assert.ok(!JSON.stringify(connected).includes('test-only'));
});
test('sanitizes filename paths while preserving supported extensions', () => {
  assert.equal(sanitizeName('..\\folder\\report?.PDF'), 'report_.pdf');
  assert.equal(sanitizeName('../../....txt'), 'file.txt');
});
