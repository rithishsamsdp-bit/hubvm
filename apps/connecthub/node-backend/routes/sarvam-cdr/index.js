const redis = require("../../redis");
const jwt = require("jsonwebtoken");

module.exports = async function (fastify, opts) {
    fastify.post("/fetch", async (req, reply) => {
        // ---------- AUTH ----------
        try {
            const authHeader = req.headers['authorization'];
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new Error("Missing or invalid Authorization header");
            }
            const token = authHeader.split(" ")[1];
            jwt.verify(token, "SomeRandomSalt");
        } catch (err) {
            return reply.code(401).send({
                status: "UNAUTHORIZED",
                reason: err.message,
            });
        }

        // ---------- LOGIC ----------
        try {
            const { unique_call_identifier } = req.body || {};

            if (!unique_call_identifier) {
                return reply.code(400).send({
                    status: "INVALID_REQUEST",
                    reason: "unique_call_identifier is required",
                });
            }

            const redis_key = `call:${unique_call_identifier}`;
            const cached = await redis.get(redis_key);

            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch {
                    return reply.code(500).send({
                        status: "ERROR",
                        reason: "Corrupted Redis payload",
                    });
                }
            }

            return {
                status: "NOT_FOUND",
                reason: "No call found for given accountId, accountNo, and clientUniqueId",
            };

        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({
                status: "ERROR",
                reason: "Internal Server Error",
            });
        }
    });
};
