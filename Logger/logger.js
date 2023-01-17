const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf, colorize, errors, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
	return `${timestamp} ${level}: ${stack || message}`;
});

const debugLogger = createLogger({
	level: "debug",
	format: combine(
		colorize(),
		timestamp({ format: "DD-MM-YY HH:mm:ss" }),
		errors({ stack: true }),
		logFormat
	),
	transports: [new transports.Console()],
});

const logger = createLogger({
	level: "info",
	format: combine(
		timestamp({ format: "DD-MM-YY HH:mm:ss" }),
		errors({ stack: true }),
		json()
	),
	transports: [
		new winston.transports.File({ filename: "error.log", level: "error" }),
		new winston.transports.File({ filename: "warn.log", level: "warn" }),
		new winston.transports.File({ filename: "info.log", level: "info" }),
	],
});

module.exports = { logger, debugLogger };
