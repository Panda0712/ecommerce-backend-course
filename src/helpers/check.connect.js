"use strict";

const mongoose = require("mongoose");
const os = require("os");
const process = require("process");
const _SECONDS = 5000;

// count connects
const countConnect = () => {
  const numConnection = mongoose.connections.length;
  console.log(`Number of connections:: ${numConnection}`);
};

// check overload of connect
const checkOverload = () => {
  setInterval(() => {
    const numConnection = mongoose.connections.length;
    const numCores = os.cpus().length;
    const memoryUsage = process.memoryUsage().rss;

    // example maximum numbers of connections based on number of cores
    const maxConnections = numCores * 5;

    console.log(`Active connections:: ${numConnection}`);
    console.log(`Memory usage:: ${memoryUsage / 1024 / 1024} MB`);

    if (numConnection > maxConnections) {
      console.log("Connections overload detected");
    }
  }, _SECONDS);
};

module.exports = {
  countConnect,
  checkOverload,
};
