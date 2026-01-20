/**
 * API Versioning Middleware
 * Provides versioned API routes for backward compatibility
 * 
 * Usage:
 * - Current version: /api/v1/...
 * - Legacy (unversioned): /api/... (redirects to v1)
 * 
 * Version Header Support:
 * - Accept-Version: v1
 * - X-API-Version: v1
 */

const { logger } = require('../Middleware/errorHandler');

// Supported API versions
const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';
const CURRENT_VERSION = 'v1';

/**
 * Extract API version from request
 * Priority: URL path > Accept-Version header > X-API-Version header > default
 */
function extractVersion(req) {
  // Check URL path for version (e.g., /api/v1/users)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch && SUPPORTED_VERSIONS.includes(pathMatch[1])) {
    return pathMatch[1];
  }
  
  // Check Accept-Version header
  const acceptVersion = req.headers['accept-version'];
  if (acceptVersion && SUPPORTED_VERSIONS.includes(acceptVersion)) {
    return acceptVersion;
  }
  
  // Check X-API-Version header
  const xApiVersion = req.headers['x-api-version'];
  if (xApiVersion && SUPPORTED_VERSIONS.includes(xApiVersion)) {
    return xApiVersion;
  }
  
  return DEFAULT_VERSION;
}

/**
 * API versioning middleware
 * Attaches version info to request and sets response headers
 */
function apiVersioning(req, res, next) {
  const version = extractVersion(req);
  
  // Attach version to request
  req.apiVersion = version;
  
  // Set response headers
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Current-Version', CURRENT_VERSION);
  
  // Deprecation warning for old versions (when we have v2+)
  if (version !== CURRENT_VERSION) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('Warning', '299 - "API version deprecated, please upgrade"');
  }
  
  next();
}

/**
 * Create versioned router
 * Wraps an Express router with version-specific path prefix
 */
function createVersionedRouter(app, version, router) {
  app.use(`/api/${version}`, router);
  logger.info(`Registered API ${version} routes`);
}

/**
 * Legacy route redirect middleware
 * Redirects unversioned /api/... to /api/v1/...
 * Only for routes that don't already have a version
 */
function legacyRouteHandler(req, res, next) {
  // Skip if already versioned
  if (req.path.match(/^\/api\/v\d+\//)) {
    return next();
  }
  
  // Skip static assets and special routes
  const skipPaths = ['/api/health', '/api/docs', '/healthz'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // For now, just continue (backward compatible)
  // In future, can redirect or log deprecation warnings
  req.apiVersion = DEFAULT_VERSION;
  next();
}

/**
 * Version check middleware for specific minimum version requirement
 * @param {string} minVersion - Minimum required version (e.g., 'v2')
 */
function requireMinVersion(minVersion) {
  return (req, res, next) => {
    const currentVersionNum = parseInt(req.apiVersion?.replace('v', '') || '1', 10);
    const requiredVersionNum = parseInt(minVersion.replace('v', ''), 10);
    
    if (currentVersionNum < requiredVersionNum) {
      return res.status(400).json({
        success: false,
        error: `This endpoint requires API version ${minVersion} or higher`,
        currentVersion: req.apiVersion,
        requiredVersion: minVersion
      });
    }
    
    next();
  };
}

module.exports = {
  apiVersioning,
  createVersionedRouter,
  legacyRouteHandler,
  requireMinVersion,
  extractVersion,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  CURRENT_VERSION
};
