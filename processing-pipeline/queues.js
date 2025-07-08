const { Queue } = require("bullmq");
const { splitterQueueName ,transcoderQueueName} = require("./queue_types/queue_types");
const path = require("path");

const connection = {
  host: "localhost",
  port: 6379,
};

const splitterQueue = new Queue(splitterQueueName, { connection });
const transcoderQueue = new Queue(transcoderQueueName, { connection });
async function addJobs() {
  console.log("Adding jobs...");
  await splitterQueue.add("split", {
    videoFile: path.join(__dirname, "../../../input.mkv"),
    sessionId: "session1",
  }, {
    attempts: 3, // 👈 Max 3 attempts
    backoff: {
      type: 'exponential', // or 'fixed'
      delay: 5000          // 5 seconds delay between retries
    }
  });
  console.log("Done");
}
async function removeJobs(){
  await splitterQueue.clean(0, 100, 'wait');
  await transcoderQueue.obliterate({ force: true });
  for(let i =0; i < 1000; i++){
await transcoderQueue.clean(0, 100, 'failed');
await transcoderQueue.clean(0, 100, 'delayed');
await transcoderQueue.clean(0, 100, 'wait');
  }
  await splitterQueue.close();
  await transcoderQueue.close();
}


module.exports = {splitterQueue ,transcoderQueue,addJobs};