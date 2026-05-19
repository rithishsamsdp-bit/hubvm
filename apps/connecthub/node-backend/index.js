const fastify = require("fastify")({
  logger: false,
});

const start = async () => {
  
  try {
    fastify.register(require("./routes/sarvam-cdr"), { prefix: "/node-backend/sarvam-cdr" });

    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Node backend listening at http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
