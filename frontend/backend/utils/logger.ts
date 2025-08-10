import * as fs from 'fs';
import { createLogger, format, transports } from 'winston';

// ログディレクトリを作成
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ログレベルを定義
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// カスタムフォーマットを作成
const customFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// ロガーを作成
const logger = createLogger({
  levels: logLevels,
  format: customFormat,
  transports: [
    // コンソール出力
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    }),
    // ファイル出力（エラーログ）
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat
    }),
    // ファイル出力（全ログ）
    new transports.File({
      filename: 'logs/combined.log',
      format: customFormat
    })
  ]
});

// 開発環境ではより詳細なログを出力
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
} else {
  logger.level = 'info';
}

export default logger;

