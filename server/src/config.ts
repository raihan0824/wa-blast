export const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const DEFAULT_COUNTRY_CODE = '62'; // Indonesia

export const BLAST_CONFIG = {
  minDelay: 1500,       // 1.5s minimum between messages
  maxDelay: 3000,       // 3s maximum between messages
  batchSize: 20,        // messages per batch
  batchCooldown: 12000, // 12s pause between batches
  retryOnFail: true,
  retryDelay: 30000,    // 30s wait before retry
};
