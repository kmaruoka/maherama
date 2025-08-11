const { checkRateLimit } = require('./apiMonitor');

// レート制限専用ミドルウェア
const createRateLimiter = (options = {}) => {
  const {
    enabled = true,
    skipPaths = [],
    skipMethods = [],
    skipSeedMode = true
  } = options;

  return (req, res, next) => {
    // レート制限が無効化されている場合はスキップ
    if (!enabled) {
      return next();
    }

    // 除外パスのチェック
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 除外メソッドのチェック
    if (skipMethods.includes(req.method)) {
      return next();
    }

    // シードモードのチェック
    const isSeedMode = process.env.SEED_MODE === 'true' ||
                      req.headers['x-seed-mode'] === 'true';

    // シードモードの場合はレート制限をスキップ
    if (skipSeedMode && isSeedMode) {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitResult = checkRateLimit(ip, req.headers);

    // レート制限に達した場合は429エラーを返す
    if (rateLimitResult.isRateLimited) {
      return res.status(429).json({
        success: false,
        type: 'error',
        message: 'Too many requests. Please try again later.',
        error: 'Rate limit exceeded'
      });
    }

    next();
  };
};

module.exports = {
  createRateLimiter
};
