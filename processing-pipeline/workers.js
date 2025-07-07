const {splitterQueueName} = require("./queue_types/queue_types");

const {splitterProcessor} = require("./processors/splitter/splitter");
const { createWorker } = require("./utils/worker.factory");

const connection = {
  host: "localhost",
  port: 6379,
};

const { worker: splitterWorker } = createWorker(
  splitterQueueName,
  splitterProcessor,
  connection
);



process.on("SIGTERM", async () => {
  console.info("SIGTERM signal received: closing queues");
  await splitterWorker.close();

  console.info("All closed");
});
