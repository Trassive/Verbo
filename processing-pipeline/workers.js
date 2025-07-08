const {splitterQueueName, transcoderQueueName} = require("./queue_types/queue_types");

const {splitterProcessor} = require("./processors/splitter");
const {transcoderProcessor} = require("./processors/transcoderProcessor");
const { createWorker } = require("./utils/worker.factory");
const { addJobs } = require("./queues");

const connection = {
  host: "localhost",
  port: 6379,
};
addJobs();
const { worker: splitterWorker } = createWorker(
  splitterQueueName,
  splitterProcessor,
  connection
);

const {worker: transcoderWorker} = createWorker(
  transcoderQueueName,
  transcoderProcessor,
  connection
);


process.on("SIGTERM", async () => {
  console.info("SIGTERM signal received: closing queues");
  await splitterWorker.close();
  await transcoderWorker.close();

  console.info("All closed");
});
