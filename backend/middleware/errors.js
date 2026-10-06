export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE')
    return res
      .status(413)
      .json({
        error: 'Files must be 10 MB or smaller.',
        code: 'FILE_TOO_LARGE',
      });
  if (error.name === 'MulterError')
    return res
      .status(400)
      .json({
        error: 'Choose one file using the file field.',
        code: 'INVALID_UPLOAD',
      });
  if (error instanceof HttpError)
    return res
      .status(error.status)
      .json({ error: error.message, code: error.code });
  // Never return SDK errors, stack traces, request URLs, or credentials.
  if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)
    return res
      .status(404)
      .json({
        error:
          'The file or bucket could not be found. Refresh the list and check your bucket name.',
        code: 'NOT_FOUND',
      });
  if (error.name === 'AbortError' || error.name === 'TimeoutError')
    return res
      .status(504)
      .json({
        error: 'Cloud storage took too long to respond. Please try again.',
        code: 'CLOUD_TIMEOUT',
      });
  res
    .status(503)
    .json({
      error:
        'Could not connect to cloud storage. Check your backend AWS credentials, region, bucket name, and IAM permissions.',
      code: 'CLOUD_UNAVAILABLE',
    });
}
