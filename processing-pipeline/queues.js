const { Queue } = require("bullmq");
const { splitterQueueName } = require("./queue_types/queue_types");
const path = require("path");

const connection = {
  host: "localhost",
  port: 6379,
};

const splitterQueue = new Queue(splitterQueueName, { connection });

module.exports = {splitterQueue}