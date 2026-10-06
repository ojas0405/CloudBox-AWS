import { config } from './config.js';
import { createStorage } from './services/s3.js';
import { createApp } from './app.js';

const app = createApp(createStorage(config), config.origin);
// Single-user classroom app: bind to this computer, rather than expose it publicly.
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`CloudBox backend ready at http://localhost:${config.port}`);
});
server.on('error', (error) => {
  console.error(
    `Backend could not start (${error.code || 'server error'}). Check PORT or close the other process.`,
  );
  process.exitCode = 1;
});
