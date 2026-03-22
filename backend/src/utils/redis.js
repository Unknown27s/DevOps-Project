const Redis = require('ioredis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 1000,
      lazyConnect: true
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  }
  return redisClient;
};

const pushToQueue = async (queueName, data) => {
  const client = getRedisClient();
  try {
    await client.lpush(queueName, JSON.stringify(data));
    console.log(`📤 Pushed job to queue: ${queueName}`);
    return true;
  } catch (error) {
    console.error('Failed to push to queue:', error);
    throw error;
  }
};

module.exports = { getRedisClient, pushToQueue };
