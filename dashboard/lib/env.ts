import { config } from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '..', '.env');
config({ path: envPath });
