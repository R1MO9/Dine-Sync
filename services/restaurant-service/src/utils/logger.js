import { createLogger, format, transports } from "winston";

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
        return `${timestamp} [${level}] ${message} ${metaStr}`;
    })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        ...(process.env.NODE_ENV === "production"
            ? [
                  new transports.File({ filename: "logs/error.log", level: "error" }),
                  new transports.File({ filename: "logs/combined.log" }),
              ]
            : []),
    ],
    exitOnError: false,
});

export default logger;
