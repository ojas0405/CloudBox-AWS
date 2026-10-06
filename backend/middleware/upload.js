import multer from 'multer';
import path from 'node:path';
import { HttpError } from './errors.js';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const types = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export function sanitizeName(name) {
  const base = name.replaceAll('\\', '/').split('/').pop().normalize('NFKC');
  const ext = path.extname(base).toLowerCase();
  const stem = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 140)
    .trim();
  return `${stem || 'file'}${ext}`;
}
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 2 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!types[ext])
      return cb(
        new HttpError(
          415,
          'Supported files: PDF, JPG, PNG, TXT, DOC, DOCX, PPT, PPTX.',
          'UNSUPPORTED_FILE',
        ),
      );
    cb(null, true);
  },
}).single('file');
export function validateFile(file) {
  if (!file || !file.size)
    throw new HttpError(
      400,
      'Choose a non-empty file to upload.',
      'FILE_REQUIRED',
    );
  const ext = path.extname(file.originalname).toLowerCase();
  const data = file.buffer;
  const starts = (hex) =>
    data.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'));
  const valid =
    ext === '.pdf'
      ? data.subarray(0, 5).toString() === '%PDF-'
      : ['.jpg', '.jpeg'].includes(ext)
        ? starts('ffd8ff')
        : ext === '.png'
          ? starts('89504e470d0a1a0a')
          : ['.docx', '.pptx'].includes(ext)
            ? starts('504b0304')
            : ['.doc', '.ppt'].includes(ext)
              ? starts('d0cf11e0a1b11ae1')
              : ext === '.txt'
                ? !data.includes(0)
                : false;
  if (!valid)
    throw new HttpError(
      415,
      'The file content does not match its extension. Choose a valid supported file.',
      'INVALID_FILE_CONTENT',
    );
  return { name: sanitizeName(file.originalname), contentType: types[ext] };
}
