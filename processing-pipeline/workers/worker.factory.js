const { Worker } = require("bullmq");

/**
 * Create a BullMQ Worker
 * @param {string} name - The name of the queue
 * @param {Function} processor - The job processor function
 * @param {Object} connection - Redis connection options
 * @param {number} [concurrency=1] - Concurrency level
 * @returns {{ worker: Worker }} - The created worker
 */
function createWorker(name, processor, connection, concurrency = 1) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency,
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
