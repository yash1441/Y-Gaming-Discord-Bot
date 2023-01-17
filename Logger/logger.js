const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors, align } = format;

const timezoned = () => {
	return new Date().toLocaleString("en-US", {
		timeZone: "Asia/Kolkata",
	});
};

const options = {
	console: {
		level: "debug",
		colorize: true,
		format: combine(
			colorize(),
			align(),
			timestamp({
				format: timezoned,
			}),
			printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
		),
	},
	file: {
		level: "info",
		filename: "./Logger/log.log",
		colorize: false,
		format: combine(
			align(),
			timestamp({
				format: timezoned,
			}),
			errors({ stack: true }),
			printf(
				(info) =>
					`${info.timestamp} ${info.level}: ${info.stack || info.message}`
			)
		),
	},
	errorFile: {
		level: "error",
		filename: "./Logger/error.log",
		colorize: false,
		format: combine(
			align(),
			timestamp({
				format: timezoned,
			}),
			errors({ stack: true }),
			printf(
				(info) =>
					`${info.timestamp} ${info.level}: ${info.stack || info.message}`
			)
		),
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
