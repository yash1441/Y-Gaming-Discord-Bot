const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors, json } = format;

const options = {
	console: {
		level: "debug",
		colorize: true,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
		format: combine(
			colorize(),
			timestamp({
				format: "YY-MM-DD HH:mm:ss",
			}),
			printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
		),
	},
	file: {
		level: "info",
		filename: "./Logger/log.log",
		colorize: false,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
		format: combine(timestamp(), errors({ stack: true }), json()),
	},
	errorFile: {
		level: "error",
		filename: "./Logger/error.log",
		colorize: false,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
		format: combine(timestamp(), errors({ stack: true }), json()),
	},
};

const logger = createLogger({
	level: "debug",
	transports: [
		new transports.Console(options.console),
		new transports.File(options.file),
		new transports.File(options.errorFile),
	],
});

module.exports = logger;
