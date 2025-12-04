const UAParser = require('ua-parser-js');

/**
 * Device Info Service
 * Parses user agent and extracts device, browser, OS information
 * Also handles IP-based geolocation
 */

/**
 * Parse user agent string to extract device info
 * @param {string} userAgent - User agent string from request
 * @returns {Object} Parsed device information
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      device: 'Unknown Device',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      userAgent: ''
    };
  }
  
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Format device name
  let device = 'Unknown Device';
  if (result.device.vendor && result.device.model) {
    device = `${result.device.vendor} ${result.device.model}`;
  } else if (result.device.type) {
    device = result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1);
  } else {
    // Infer from OS
    if (result.os.name?.toLowerCase().includes('android')) {
      device = 'Android Device';
    } else if (result.os.name?.toLowerCase().includes('ios')) {
      device = 'iPhone/iPad';
    } else if (result.os.name?.toLowerCase().includes('mac')) {
      device = 'Mac';
    } else if (result.os.name?.toLowerCase().includes('windows')) {
      device = 'Windows PC';
    } else if (result.os.name?.toLowerCase().includes('linux')) {
      device = 'Linux PC';
    } else {
      device = 'Desktop';
    }
  }
  
  // Format browser name with version
  let browser = 'Unknown Browser';
  if (result.browser.name) {
    browser = result.browser.name;
    if (result.browser.version) {
      const majorVersion = result.browser.version.split('.')[0];
      browser += ` ${majorVersion}`;
    }
  }
  
  // Format OS with version
  let os = 'Unknown OS';
  if (result.os.name) {
    os = result.os.name;
    if (result.os.version) {
      os += ` ${result.os.version}`;
    }
  }
  
  return {
    device,
    browser,
    os,
    userAgent,
    raw: result
  };
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  // Check various headers for proxied requests
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is client
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback to socket remote address
  return req.socket?.remoteAddress || req.ip || 'Unknown';
}

/**
 * Get geolocation from IP address using free IP-API service
 * Falls back gracefully if service is unavailable
 * @param {string} ipAddress - IP address to geolocate
 * @returns {Object} Location information
 */
async function getLocationFromIP(ipAddress) {
  const defaultLocation = {
    city: '',
    region: '',
    country: '',
    countryCode: '',
    formatted: 'Unknown Location',
    coordinates: { lat: null, lon: null }
  };
  
  // Skip for localhost/private IPs
  if (!ipAddress || 
      ipAddress === '::1' || 
      ipAddress === '127.0.0.1' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.')) {
    return { ...defaultLocation, formatted: 'Local Network' };
  }
  
  try {
    // Using ip-api.com (free, no API key needed, 45 req/min limit)
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,lat,lon`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      return defaultLocation;
    }
    
    const data = await response.json();
    
    if (data.status === 'fail') {
      return defaultLocation;
    }
    
    const location = {
      city: data.city || '',
      region: data.regionName || data.region || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      coordinates: {
        lat: data.lat || null,
        lon: data.lon || null
      }
    };
    
    // Format location string
    const parts = [location.city, location.region, location.country].filter(Boolean);
    location.formatted = parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    
    return location;
  } catch (error) {
    console.error('Geolocation lookup failed:', error.message);
    return defaultLocation;
  }
}

/**
 * Get complete device info from request
 * Combines user agent parsing, IP extraction, and geolocation
 * @param {Object} req - Express request object
 * @returns {Object} Complete device information
 */
async function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = getClientIP(req);
  
  const deviceInfo = parseUserAgent(userAgent);
  const location = await getLocationFromIP(ipAddress);
  
  return {
    ...deviceInfo,
    ipAddress,
    location
  };
}

/**
 * Synchronous version - skips geolocation
 * Use when you don't need location data immediately
 * @param {Object} req - Express request object
 * @returns {Object} Device information without location
 */
function getDeviceInfoSync(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = getClientIP(req);
  
  const deviceInfo = parseUserAgent(userAgent);
  
  return {
    ...deviceInfo,
    ipAddress,
    location: { formatted: 'Loading...' }
  };
}

/**
 * Format device info for display
 * @param {Object} deviceInfo - Device info object
 * @returns {string} Formatted string for display
 */
function formatDeviceInfo(deviceInfo) {
  const parts = [];
  
  if (deviceInfo.browser && deviceInfo.browser !== 'Unknown Browser') {
    parts.push(deviceInfo.browser);
  }
  
  if (deviceInfo.os && deviceInfo.os !== 'Unknown OS') {
    parts.push(`on ${deviceInfo.os}`);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
}

module.exports = {
  parseUserAgent,
  getClientIP,
  getLocationFromIP,
  getDeviceInfo,
  getDeviceInfoSync,
  formatDeviceInfo
};
