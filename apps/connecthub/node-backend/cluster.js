const cluster = require("cluster");
const os = require("os");

const CPU_COUNT = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Master ${process.pid}`);
    console.log(`Starting ${CPU_COUNT} workers`);

    for (let i = 0; i < CPU_COUNT; i++) {
        cluster.fork();
    }

    cluster.on("exit", () => {
        cluster.fork();
    });
} else {
    require("./index");
}
