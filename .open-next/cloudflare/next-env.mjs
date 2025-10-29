export const production = {
  GROQ_API_KEY: "GROQ_API_KEY_HERE",
  NEXT_PUBLIC_APP_URL: "https://umuo.app",
  TRANSCRIPTION_TIMEOUT_MS: "180000",
  TRANSCRIPTION_RETRY_COUNT: "2",
  TRANSCRIPTION_MAX_CONCURRENCY: "2",
  GROQ_BASE_URL: "https://api.groq.com/openai/v1",
  NODE_ENV: "production",
  D1_DATABASE_ID: "5900e9a3-d502-43fb-9aac-a80f997d8f42",
  KV_NAMESPACE_ID: "d9de145b86f84324a4e03ba7eed45994",
  R2_BUCKET_NAME: "umuo-app-files",
  JWT_SECRET: "your-jwt-secret-here-replace-in-production",
  ENCRYPTION_KEY: "your-encryption-key-here-replace-in-production",
};

export const development = {
  GROQ_API_KEY: "GROQ_API_KEY_HERE",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  TRANSCRIPTION_TIMEOUT_MS: "180000",
  TRANSCRIPTION_RETRY_COUNT: "2",
  TRANSCRIPTION_MAX_CONCURRENCY: "2",
};

export const test = {
  GROQ_API_KEY: "GROQ_API_KEY_HERE",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  TRANSCRIPTION_TIMEOUT_MS: "180000",
  TRANSCRIPTION_RETRY_COUNT: "2",
  TRANSCRIPTION_MAX_CONCURRENCY: "2",
};
