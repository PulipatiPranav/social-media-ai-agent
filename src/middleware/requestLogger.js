const logger = require('../config/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log the incoming request
  logger.http(`${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const contentLength = res.get('Content-Length') || 0;
    
    logger.http(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${contentLength}bytes`
    );
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = requestLogger;