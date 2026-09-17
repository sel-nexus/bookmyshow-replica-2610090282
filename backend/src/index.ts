/** Start the OTP access API server. */
import { createApp } from './app';
import { config } from './config';
import { createDatabase } from './db/database';

const database = createDatabase(config.databasePath);
const app = createApp(database, config);

/** Start listening for HTTP requests. */
function startServer(): void {
  app.listen(config.port, () => {
    console.log(`OTP access API listening on port ${config.port}`);
  });
}

startServer();
