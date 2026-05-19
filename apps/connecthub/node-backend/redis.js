const Redis = require("ioredis");

const redis = new Redis({
    host: "testnew.ks3tw6.clustercfg.aps1.cache.amazonaws.com",
    port: 6379,

    // ❌ NO TLS (your Redis is non-TLS)
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 200,
});

redis.on("connect", () => {
    console.log("✅ Redis connected (NON-TLS)");
});

redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
});

module.exports = redis;
