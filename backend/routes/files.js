import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { upload, validateFile } from '../middleware/upload.js';

function getKey(req) {
  const key = req.query.key;
  if (
    typeof key !== 'string' ||
    !key ||
    Buffer.byteLength(key) > 1024 ||
    /[\x00-\x1f\x7f]/.test(key)
  )
    throw new HttpError(400, 'A valid object key is required.', 'INVALID_KEY');
  return key;
}
export function fileRoutes(storage) {
  const router = Router();
  router.get('/', async (req, res) =>
    res.json({ files: await storage.list() }),
  );
  router.post('/upload', upload, async (req, res) => {
    const validated = validateFile(req.file);
    res
      .status(201)
      .json({
        file: await storage.put(req.file, validated),
        message: 'File uploaded to S3.',
      });
  });
  router.get('/url', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await storage.url(getKey(req), req.query.download === 'true'));
  });
  router.delete('/', async (req, res) => {
    await storage.remove(getKey(req));
    res.json({ message: 'File deleted from S3.' });
  });
  return router;
}
