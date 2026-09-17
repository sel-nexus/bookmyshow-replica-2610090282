/** Start the OTP access API server. */
import { createApp } from './app';
import { loadRuntimeConfig } from './config';
import { createDatabase } from './db/database';

const config = loadRuntimeConfig();
const database = createDatabase(config.databasePath);
const app = createApp(database, config);

/** Start listening for HTTP requests. */
function startServer(): void {
  app.listen(config.port, () => {
    console.log(`OTP access API listening on port ${config.port}`);
  });
}

startServer();
