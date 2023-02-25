import * as winston from "winston"

export const logger = winston.createLogger({
    level: 'debug',
    transports: [
        new winston.transports.Console()
    ],
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.colorize(),
        winston.format.printf(/* istanbul ignore next */(info) => {
            const {timestamp, level, message} = info;
            const prefix = "homeautomation:";
            return `${timestamp.split('.')[0]} [${level}]: ${message}`;
        }),
    ),
});

export const streamLogger = id => val => logger.debug(`${id} => (${val})`);