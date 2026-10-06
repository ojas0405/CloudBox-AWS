import { randomUUID } from 'node:crypto';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from '../middleware/errors.js';
import { types } from '../middleware/upload.js';
import path from 'node:path';

export function displayName(key) {
  return key
    .split('/')
    .pop()
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27}--/i, '');
}
export function createStorage(config, injectedClient, signer = getSignedUrl) {
  const configured = Boolean(
    config.region &&
    config.bucket &&
    (config.useDefaultCredentials ||
      (config.accessKeyId && config.secretAccessKey)),
  );
  const client = configured
    ? injectedClient ||
      new S3Client({
        region: config.region,
        maxAttempts: 2,
        ...(config.useDefaultCredentials
          ? {}
          : {
              credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                ...(config.sessionToken
                  ? { sessionToken: config.sessionToken }
                  : {}),
              },
            }),
      })
    : null;
  function ensureConfigured() {
    if (!configured)
      throw new HttpError(
        503,
        'AWS is not configured. Fill in backend/.env and restart the backend.',
        'NOT_CONFIGURED',
      );
  }
  async function send(command) {
    ensureConfigured();
    return client.send(command, { abortSignal: AbortSignal.timeout(15000) });
  }
  return {
    async status() {
      const info = {
        provider: 'Amazon Web Services',
        service: 'Amazon S3',
        storageType: 'Object Storage',
      };
      if (!configured)
        return {
          ...info,
          status: 'not_configured',
          message: 'Add your AWS settings to backend/.env to connect.',
        };
      try {
        await send(
          new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1 }),
        );
        return {
          ...info,
          status: 'connected',
          region: config.region,
          message:
            'S3 responded successfully. Upload and download also require object permissions.',
        };
      } catch {
        return {
          ...info,
          status: 'disconnected',
          message:
            'Could not reach S3. Check credentials, region, bucket, and permissions.',
        };
      }
    },
    async list() {
      const files = [];
      let token;
      do {
        const page = await send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            ContinuationToken: token,
          }),
        );
        for (const object of page.Contents || []) {
          if (!object.Key || object.Key.endsWith('/')) continue;
          const name = displayName(object.Key);
          files.push({
            key: object.Key,
            name,
            size: object.Size || 0,
            lastModified: object.LastModified?.toISOString() || null,
            type: name.includes('.')
              ? name.split('.').pop().toLowerCase()
              : 'file',
          });
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return files.sort((a, b) =>
        (b.lastModified || '').localeCompare(a.lastModified || ''),
      );
    },
    async put(file, validated) {
      const key = `${randomUUID()}--${validated.name}`;
      await send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: validated.contentType,
          ServerSideEncryption: 'AES256',
        }),
      );
      return { key, name: validated.name, size: file.size };
    },
    async url(key, download) {
      await send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
      // Attachments for Office/unknown files; inline is limited to common safe viewers.
      const name = displayName(key);
      const inline = !download && /\.(pdf|jpe?g|png|txt)$/i.test(name);
      const disposition = `${inline ? 'inline' : 'attachment'}; filename="${name.replace(/[^a-zA-Z0-9._ -]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`;
      const url = await signer(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ResponseContentDisposition: disposition,
          ...(inline
            ? { ResponseContentType: types[path.extname(name).toLowerCase()] }
            : {}),
        }),
        { expiresIn: 300 },
      );
      return { url, expiresIn: 300 };
    },
    async remove(key) {
      await send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
