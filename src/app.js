const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const { checkOverload } = require("./helpers/check.connect");
const app = express();
app.use(express.json()); // Thêm dòng này
app.use(express.urlencoded({ extended: true }));

// init middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// init db
require("./dbs/init.mongodb");
// checkOverload();

// init routes
app.use("/", require("./routers"));

// handling errors

module.exports = app;
