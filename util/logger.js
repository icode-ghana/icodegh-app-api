const winston = require("winston");
const { format, transports } = winston;

const levels = {
  error: "error",
  warn: "warn",
  info: "info",
  verbose: "verbose",
  debug: "debug",
  silly: "silly"
};

const logger = winston.createLogger({
  level: levels,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({
      filename: "./logs/combined.log",
      level: "info"
    }),
    new winston.transports.File({
      filename: "./logs/errors.log",
      level: "error"
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: "./logs/exceptions.log" })
  ]
});

module.exports = logger;
