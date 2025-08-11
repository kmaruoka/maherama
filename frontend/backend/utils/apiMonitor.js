const logger = require('./logger').default;

// API監視用の統計情報を保持
const apiMonitoring = {
  // レート制限用のカウンター（IPアドレス別）
  rateLimitCounters: new Map(),

  // 異常パターン検出用の履歴（IPアドレス別）
  patternHistory: new Map(),

  // アラート履歴（重複アラートを防ぐため）
  alertHistory: new Map(),

  // 設定
  config: {
    rateLimit: {
      windowMs: 60000, // 1分間
      maxRequests: 100, // 1分間に最大100リクエスト
      burstLimit: 20 // バースト時の最大リクエスト数
    },
    anomalyDetection: {
      // 異常パターンの閾値
      consecutiveErrors: 5, // 連続エラー数
      errorRateThreshold: 0.3, // エラー率30%以上
      unusualPatternThreshold: 10 // 異常パターンの閾値
    },
    alertCooldown: 300000 // アラートのクールダウン時間（5分）
  }
};

// レート制限チェック
const checkRateLimit = (ip) => {
  // localhostからのアクセスはレート制限を無効化
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown') {
    return {
      isRateLimited: false,
      requestCount: 0,
      remainingRequests: Infinity
    };
  }

  const now = Date.now();
  const windowMs = apiMonitoring.config.rateLimit.windowMs;

  if (!apiMonitoring.rateLimitCounters.has(ip)) {
    apiMonitoring.rateLimitCounters.set(ip, []);
  }

  const counter = apiMonitoring.rateLimitCounters.get(ip);

  // 古いエントリを削除
  const validEntries = counter.filter(timestamp => now - timestamp < windowMs);
  apiMonitoring.rateLimitCounters.set(ip, validEntries);

  // 新しいリクエストを追加
  validEntries.push(now);

  // レート制限チェック
  const requestCount = validEntries.length;
  const isRateLimited = requestCount > apiMonitoring.config.rateLimit.maxRequests;

  if (isRateLimited) {
    logger.warn(`Rate limit exceeded for IP: ${ip}, requests: ${requestCount}`);
  }

  return {
    isRateLimited,
    requestCount,
    remainingRequests: Math.max(0, apiMonitoring.config.rateLimit.maxRequests - requestCount)
  };
};

// 異常パターン検出
const detectAnomaly = (ip, path, statusCode, method) => {
  const now = Date.now();
  const key = `${ip}:${path}`;

  if (!apiMonitoring.patternHistory.has(key)) {
    apiMonitoring.patternHistory.set(key, {
      requests: [],
      errors: [],
      lastAlert: 0
    });
  }

  const pattern = apiMonitoring.patternHistory.get(key);

  // 古いエントリを削除（1時間前まで）
  const oneHourAgo = now - 3600000;
  pattern.requests = pattern.requests.filter(req => req.timestamp > oneHourAgo);
  pattern.errors = pattern.errors.filter(err => err.timestamp > oneHourAgo);

  // 新しいリクエストを追加
  pattern.requests.push({
    timestamp: now,
    statusCode,
    method
  });

  // エラーの場合
  if (statusCode >= 400) {
    pattern.errors.push({
      timestamp: now,
      statusCode,
      method
    });
  }

  // 異常パターンの検出
  const anomalies = [];

  // 1. 連続エラー
  const recentErrors = pattern.errors.filter(err => now - err.timestamp < 300000); // 5分間
  if (recentErrors.length >= apiMonitoring.config.anomalyDetection.consecutiveErrors) {
    anomalies.push(`Consecutive errors: ${recentErrors.length} errors in 5 minutes`);
  }

  // 2. 高エラー率
  const recentRequests = pattern.requests.filter(req => now - req.timestamp < 300000); // 5分間
  if (recentRequests.length > 0) {
    const errorRate = recentErrors.length / recentRequests.length;
    if (errorRate >= apiMonitoring.config.anomalyDetection.errorRateThreshold) {
      anomalies.push(`High error rate: ${(errorRate * 100).toFixed(1)}% errors`);
    }
  }

  // 3. 異常なリクエスト頻度
  const requestsPerMinute = pattern.requests.filter(req => now - req.timestamp < 60000).length;
  if (requestsPerMinute > apiMonitoring.config.rateLimit.burstLimit) {
    anomalies.push(`High request frequency: ${requestsPerMinute} requests per minute`);
  }

  // 4. 異常なHTTPメソッドの組み合わせ
  const unusualMethods = pattern.requests.filter(req =>
    req.method === 'DELETE' || req.method === 'PUT' || req.method === 'PATCH'
  );
  if (unusualMethods.length > apiMonitoring.config.anomalyDetection.unusualPatternThreshold) {
    anomalies.push(`Unusual HTTP methods: ${unusualMethods.length} ${unusualMethods[0].method} requests`);
  }

  return anomalies;
};

// アラート送信
const sendAlert = (ip, path, anomalies, details) => {
  const alertKey = `${ip}:${path}:${anomalies.join(',')}`;
  const now = Date.now();

  // クールダウン期間内の場合はアラートを送信しない
  if (apiMonitoring.alertHistory.has(alertKey)) {
    const lastAlert = apiMonitoring.alertHistory.get(alertKey);
    if (now - lastAlert < apiMonitoring.config.alertCooldown) {
      return;
    }
  }

  // アラート履歴を更新
  apiMonitoring.alertHistory.set(alertKey, now);

  // アラートログを出力
  logger.error(`🚨 API ANOMALY DETECTED: IP=${ip}, Path=${path}, Anomalies=${anomalies.join(', ')}`, {
    type: 'anomaly_alert',
    ip,
    path,
    anomalies,
    details,
    timestamp: new Date().toISOString()
  });

  // ここで実際のアラート送信処理を追加（Slack、メール、SMSなど）
  // sendSlackAlert(ip, path, anomalies, details);
  // sendEmailAlert(ip, path, anomalies, details);
};

// 監視設定の更新
const updateConfig = (newConfig) => {
  Object.assign(apiMonitoring.config, newConfig);
  logger.info('API monitoring configuration updated', { config: apiMonitoring.config });
};

// 監視統計の取得
const getMonitoringStats = () => {
  return {
    rateLimitCounters: apiMonitoring.rateLimitCounters.size,
    patternHistory: apiMonitoring.patternHistory.size,
    alertHistory: apiMonitoring.alertHistory.size,
    config: apiMonitoring.config
  };
};

// 監視データのクリア（メモリリーク防止）
const clearOldData = () => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  // 古いレート制限データをクリア
  for (const [ip, timestamps] of apiMonitoring.rateLimitCounters.entries()) {
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < 60000);
    if (validTimestamps.length === 0) {
      apiMonitoring.rateLimitCounters.delete(ip);
    } else {
      apiMonitoring.rateLimitCounters.set(ip, validTimestamps);
    }
  }

  // 古いパターンデータをクリア
  for (const [key, pattern] of apiMonitoring.patternHistory.entries()) {
    pattern.requests = pattern.requests.filter(req => req.timestamp > oneHourAgo);
    pattern.errors = pattern.errors.filter(err => err.timestamp > oneHourAgo);

    if (pattern.requests.length === 0 && pattern.errors.length === 0) {
      apiMonitoring.patternHistory.delete(key);
    }
  }

  // 古いアラート履歴をクリア
  for (const [key, timestamp] of apiMonitoring.alertHistory.entries()) {
    if (now - timestamp > apiMonitoring.config.alertCooldown * 2) {
      apiMonitoring.alertHistory.delete(key);
    }
  }
};

// 定期的なクリーンアップ（1時間ごと）
setInterval(clearOldData, 3600000);

module.exports = {
  checkRateLimit,
  detectAnomaly,
  sendAlert,
  updateConfig,
  getMonitoringStats,
  clearOldData
};
