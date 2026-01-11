export const THROTTLE_LIMITS = {
  AUTH: {
    LOGIN: { short: { limit: 3, ttl: 60000 } }, // 3 requests per minute
    RESET: { short: { limit: 1, ttl: 300000 } }, // 1 request per 5 minutes
  },
  USER: {
    PROFILE: { medium: { limit: 20, ttl: 60000 } }, // 20 requests per minute
    POSTS: { long: { limit: 100, ttl: 3600000 } }, // 100 requests per hour
  },
  API: {
    DEFAULT: {
      short: { limit: 5, ttl: 1000 }, // 5 requests per second
      medium: { limit: 100, ttl: 60000 }, // 100 requests per minute
      long: { limit: 1000, ttl: 3600000 }, // 1000 requests per hour
    },
  },
} as const;
