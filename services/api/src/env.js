import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(currentDir, '../../../.env');
const apiEnvPath = path.resolve(currentDir, '../.env');

config({ path: rootEnvPath, quiet: true });
config({ path: apiEnvPath, override: true, quiet: true });
