import { config } from 'dotenv';
import { resolve } from 'node:path';

// Resolve relative to this module, independent of npm's working directory.
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../../.env') });
