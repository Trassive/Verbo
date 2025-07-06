const {
  concatQueueName,
  splitterQueueName,
  transcoderQueueName,
} = require("./queue_types");

const {splitterProcessor} = require("./workers/splitter/splitter");
// const transcoderProcessor = require("./workers/transcoder");
const { createWorker } = require("./workers/worker.factory");

const connection = {
  host: "localhost",
  port: 6379,
};

const { worker: splitterWorker } = createWorker(
  splitterQueueName,
  splitterProcessor,
  connection
);

// const { worker: transcoderWorker, scheduler: transcoderScheduler } =
//   createWorker(transcoderQueueName, transcoderProcessor, connection, 8);


process.on("SIGTERM", async () => {
  console.info("SIGTERM signal received: closing queues");

  await splitterWorker.close();
  // await transcoderWorker.close();
  // await transcoderScheduler.close();
  // await concatWorker.close();
  // await concatScheduler.close();

  console.info("All closed");
});
