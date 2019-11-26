"use-strict";
//@ts-check

/**
 * Module Dependencies
 */
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const errorhandler = require("errorhandler");
const logger = require("./util/logger");
const agenda = require("agenda");

global.logger = logger;
mongoose.Promise = global.Promise;

const {
  NODE_ENV,
  SERVER_NAME,
  SERVER_VERSION,
  PORT,
  DB_URI
} = process.env;

global.server = express();
server.version = SERVER_VERSION;
server.name = SERVER_NAME;

const db = mongoose.connection;

server.use(cors());
server.use(bodyParser.json());

if (process.env.NODE_ENV === "development") {
  // only use in development
  server.use(errorhandler());
}

server.use(function(req, res, next) {
  function afterResponse() {
    res.removeListener("finish", afterResponse);
    res.removeListener("close", afterResponse);

    let userRole = "unknown";
    let username = "none";

    if (req.preAuth) {
      userRole = req.preAuth.role;
      username = req.preAuth.user;
    }

    logger.info("all incoming requests", {
      method: req.method,
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      url: req.url,
      params: req.params,
      role: userRole,
      username: username,
      body: req.body || {},
      status: res.statusCode,
      error: res.error
    });
  }

  res.on("finish", afterResponse);
  res.on("close", afterResponse);

  next();

  // action before request
  // eventually calling `next()`
});

/**
 * Attach Server, Connect to DB & Setup Routes
 */
server.listen(PORT, () => {
  process.on("unhandledRejection", error => {
    console.warn("************* unhandledRejection", error);
    logger.error("unhandledRejection", { error: err.message });
  });

  mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  });

  const queue = new agenda({
    mongo: db,
    collection: "queue"
  });

  queue.on("error", (err, job) => {
    console.log("agenda", err);
    logger.error("Agenda Error", { error: err.message });
  });

  db.on("error", err => {
    console.log("Error connecting to database", err);
    logger.error("Mongo Error", { error: err.message });
  });

  db.once("open", async () => {
    require("./routes");
    NODE_ENV !== "test" && (await queue.start());
    global.queue = queue;
    NODE_ENV !== "test" && require("./events/workers");
    // NODE_ENV !== 'test' && require('./events/tasks')
  });

  console.log(
    "%s v%s ready to accept connections on port %s in %s environment.",
    SERVER_NAME,
    SERVER_VERSION,
    PORT,
    NODE_ENV
  );
});
