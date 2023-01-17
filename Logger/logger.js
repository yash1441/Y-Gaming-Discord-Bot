const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
	return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
	level: "debug",
	format: combine(
		colorize(),
		timestamp(),
		errors({ stack: true }),
		logFormat
	),
	transports: [new transports.Console()],
});

module.exports = logger;
