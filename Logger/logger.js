const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors, json } = format;

const logFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
	level: "info",
	format: combine(
		timestamp({ format: "DD-MM-YY HH:mm:ss" }),
		errors({ stack: true }),
		json()
	),
	transports: [
		new transports.File({ filename: "./Logger/error.log", level: "warn" }),
		new transports.File({ filename: "./Logger/log.log", level: "info" }),
		new transports.Console({
			level: "debug",
			format: combine(
				colorize(),
				timestamp({ format: "DD-MM-YY HH:mm:ss" }),
				logFormat
			),
		}),
	],
});

module.exports = logger;
