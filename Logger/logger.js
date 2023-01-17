const { format, createLogger, transports } = require("winston");
const { timestamp, combine, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
	level: "debug",
	format: combine(
		colorize(),
		timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
		logFormat
	),
	transports: [new transports.Console()],
});

module.exports = logger;
