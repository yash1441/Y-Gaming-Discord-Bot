const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors, json } = format;

const options = {
	console: {
		level: "debug",
		handleExceptions: true,
		json: false,
		colorize: true,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
	},
	file: {
		level: "info",
		filename: "./Logger/log.log",
		json: true,
		colorize: false,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
	},
	errorFile: {
		level: "error",
		filename: "./Logger/error.log",
		json: true,
		colorize: false,
		timestamp: function () {
			return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
		},
	},
};

const logger = createLogger({
	transports: [
		new transports.Console(options.console),
		new transports.File(options.file),
		new transports.File(options.errorFile),
	],
});

module.exports = logger;
