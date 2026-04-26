// Set test environment variables before loading config modules
// This must be imported first by test files that load modules that use loadConfig()
process.env.AUTH_ENABLED = "false";
process.env.SESSION_SECRET = "test-session-secret-for-ide-v001";
process.env.LLM_PROVIDER = "fake";
process.env.NODE_ENV = "test";
