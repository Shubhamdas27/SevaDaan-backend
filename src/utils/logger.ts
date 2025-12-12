import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/config';

// Function to safely create directories
const ensureDirectoryExists = (directory: string): boolean => {
  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log(`Created directory: ${directory}`);
    }
    return true;
  } catch (err) {
    console.error(`Failed to create directory ${directory}:`, err);
    return false;
  }
};

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
const logDirExists = ensureDirectoryExists(logDir);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Only add file transports if directory exists
if (logDirExists) {
  transports.push(
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
    })
  );
}

// Always add console transport regardless of environment
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    ),
    handleExceptions: true,
  })
);

// Create the logger
const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'sevadaan-backend' },
  transports,
  exitOnError: false, // Don't crash on exception
});

// Create a stream object with a 'write' function that will be used by Morgan
(logger as any).stream = {
  write: (message: string) => {
    try {
      logger.info(message.trim());
    } catch (err) {
      console.log(message.trim());
      console.error('Error while logging with logger.stream:', err);
    }
  },
};

export default logger;
