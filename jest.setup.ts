// Add any global test setup here
jest.setTimeout(10000) // Set default timeout to 10 seconds

// Mock environment variables that might be needed
process.env.PAYLOAD_SECRET = 'test-secret'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.SPORTMONKS_API_TOKEN = 'test-token'
