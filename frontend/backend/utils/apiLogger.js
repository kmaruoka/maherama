const logger = require('./logger').default;

// APIログ用のカスタムフォーマット
const apiLogFormat = (level, message, meta) => {
  const timestamp = new Date().toISOString();

  // メタデータを安全に処理（1行で出力）
  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    try {
      // レスポンスボディが文字列の場合は特別処理
      if (meta.body && typeof meta.body === 'string') {
        const safeMeta = { ...meta };
        if (safeMeta.body.length > 500) {
          safeMeta.body = safeMeta.body.substring(0, 500) + '... (truncated)';
        }
        metaStr = ` ${JSON.stringify(safeMeta)}`;
      } else {
        metaStr = ` ${JSON.stringify(meta)}`;
      }
    } catch (error) {
      metaStr = ` ${JSON.stringify({ error: 'Failed to stringify meta data' })}`;
    }
  }

  return `[${timestamp}] API_${level.toUpperCase()}: ${message}${metaStr}`;
};

// 機密情報をマスクする関数
const maskSensitiveData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'jwt', 'secret', 'key', 'authorization',
    'cookie', 'session', 'api_key', 'apikey', 'private_key'
  ];

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  const masked = { ...data };
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
};

// リクエストボディを安全にログ出力
const safeLogBody = (body) => {
  if (!body) return body;
  return maskSensitiveData(body);
};

// レスポンスボディを安全にログ出力（サイズ制限付き）
const safeLogResponse = (body, maxSize = 1000) => {
  if (!body) return body;

  // 文字列の場合はそのまま返す（1文字ずつ分割を防ぐ）
  if (typeof body === 'string') {
    if (body.length > maxSize) {
      return {
        _truncated: true,
        _originalSize: body.length,
        _truncatedSize: maxSize,
        _preview: body.substring(0, maxSize) + '...'
      };
    }
    return body;
  }

  // オブジェクトや配列の場合
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > maxSize) {
    return {
      _truncated: true,
      _originalSize: bodyStr.length,
      _truncatedSize: maxSize,
      _preview: bodyStr.substring(0, maxSize) + '...'
    };
  }

  return maskSensitiveData(body);
};

// APIログ用のミドルウェア
const apiLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // リクエスト情報をログ出力
  const requestLog = {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: maskSensitiveData(req.headers),
    body: safeLogBody(req.body),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  logger.info(apiLogFormat('INFO', `API Request: ${req.method} ${req.path}`, {
    type: 'request',
    ...requestLog
  }));

  // レスポンスをインターセプト
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    const responseLog = {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      headers: maskSensitiveData(res.getHeaders()),
      timestamp: new Date().toISOString()
    };

    // レスポンスボディの処理を改善
    responseLog.body = safeLogResponse(body, 2000);

    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    logger[logLevel.toLowerCase()](apiLogFormat(logLevel, `API Response: ${req.method} ${req.path} - ${res.statusCode}`, {
      type: 'response',
      ...responseLog
    }));

    return originalSend.call(this, body);
  };

  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    const responseLog = {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      headers: maskSensitiveData(res.getHeaders()),
      timestamp: new Date().toISOString()
    };

    // レスポンスボディの処理を改善
    responseLog.body = safeLogResponse(body, 2000);

    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    logger[logLevel.toLowerCase()](apiLogFormat(logLevel, `API Response: ${req.method} ${req.path} - ${res.statusCode}`, {
      type: 'response',
      ...responseLog
    }));

    return originalJson.call(this, body);
  };

  next();
};

// エラーハンドリング用のミドルウェア
const errorLogger = (err, req, res, next) => {
  const errorLog = {
    requestId: req.headers['x-request-id'] || 'unknown',
    method: req.method,
    url: req.url,
    path: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    timestamp: new Date().toISOString()
  };

  logger.error(apiLogFormat('ERROR', `API Error: ${req.method} ${req.path}`, {
    type: 'error',
    ...errorLog
  }));

  next(err);
};

// API統計情報を収集するミドルウェア
const apiStats = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const stats = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    };

    // 統計情報をログ出力（必要に応じて別ファイルに保存）
    logger.debug(apiLogFormat('DEBUG', `API Stats: ${req.method} ${req.path}`, {
      type: 'stats',
      ...stats
    }));
  });

  next();
};

// 特定のエンドポイントを除外するオプション
const createApiLogger = (options = {}) => {
  const {
    excludePaths = [],
    excludeMethods = [],
    logRequestBody = true,
    logResponseBody = true,
    maxResponseSize = 1000
  } = options;

  return (req, res, next) => {
    // 除外条件をチェック
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    if (excludeMethods.includes(req.method)) {
      return next();
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // リクエスト情報をログ出力
    const requestLog = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: maskSensitiveData(req.headers),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    if (logRequestBody) {
      requestLog.body = safeLogBody(req.body);
    }

    logger.info(apiLogFormat('INFO', `API Request: ${req.method} ${req.path}`, {
      type: 'request',
      ...requestLog
    }));

    // レスポンスをインターセプト
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body) {
      const responseTime = Date.now() - startTime;
      const responseLog = {
        requestId,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        headers: maskSensitiveData(res.getHeaders()),
        timestamp: new Date().toISOString()
      };

      if (logResponseBody) {
        responseLog.body = safeLogResponse(body, maxResponseSize);
      }

      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      logger[logLevel.toLowerCase()](apiLogFormat(logLevel, `API Response: ${req.method} ${req.path} - ${res.statusCode}`, {
        type: 'response',
        ...responseLog
      }));

      return originalSend.call(this, body);
    };

    res.json = function(body) {
      const responseTime = Date.now() - startTime;
      const responseLog = {
        requestId,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        headers: maskSensitiveData(res.getHeaders()),
        timestamp: new Date().toISOString()
      };

      if (logResponseBody) {
        responseLog.body = safeLogResponse(body, maxResponseSize);
      }

      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      logger[logLevel.toLowerCase()](apiLogFormat(logLevel, `API Response: ${req.method} ${req.path} - ${res.statusCode}`, {
        type: 'response',
        ...responseLog
      }));

      return originalJson.call(this, body);
    };

    next();
  };
};

module.exports = {
  apiLogger,
  errorLogger,
  apiStats,
  createApiLogger
};
