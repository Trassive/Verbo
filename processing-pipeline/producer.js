const { Queue } = require("bullmq");
const { splitterQueueName } = require("./queue_types");
const path = require("path");

const connection = {
  host: "localhost",
  port: 6379,
};

const splitterQueue = new Queue(splitterQueueName, { connection });

async function addJobs() {
  console.log("Adding jobs...");
  await splitterQueue.add("split", {
    videoFile: "C:\Users\Ishaan\Downloads\input.mkv",
  });
  console.log("Done");
}

addJobs();
