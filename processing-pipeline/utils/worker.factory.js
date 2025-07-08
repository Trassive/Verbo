const { Worker } = require("bullmq");
// limit set
function createWorker(name, processor, connection, concurrency = 1) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency,
  });
  worker.on("ready", () => {
    console.log(`Worker for queue ${name} is ready`);
  });

  worker.on("completed", (job) => {
    console.log(`Completed job on queue ${name}`);
  });

  worker.on("failed", (job, err) => {
    console.log(`Failed job on queue ${name}`, err);
  });

  return { worker };
}

module.exports = { createWorker };
