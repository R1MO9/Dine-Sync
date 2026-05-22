import { createLogger, format, transports } from "winston";
import config from "../config.js";

const logger = createLogger({
    level: config.env === "production" ? "info" : "debug",

    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        config.env === "production"
            ? format.json()
            : format.combine(
                  format.colorize(),
                  format.printf(({ timestamp, level, message, ...meta }) => {
                      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
                      return `${timestamp} [${level}] ${message} ${metaStr}`;
                  })
              )
    ),

    transports: [
        new transports.Console(),
        ...(config.env === "production"
            ? [
                  new transports.File({ filename: "logs/error.log", level: "error" }),
                  new transports.File({ filename: "logs/combined.log" }),
              ]
            : []),
    ],

    exitOnError: false,
});

export default logger;
