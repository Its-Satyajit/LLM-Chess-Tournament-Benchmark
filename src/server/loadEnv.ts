import { resolve } from 'path'

if (process.loadEnvFile) {
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'))
  } catch {
    // ignore if already loaded or missing
  }
}
