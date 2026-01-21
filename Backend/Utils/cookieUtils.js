/**
 * Cookie Utilities for Refresh Token Management
 * Separated to avoid circular dependencies between User controller and authRoutes
 */

// Environment check for cookie settings
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.VERCEL || !!process.env.SPACE_ID;

// Cookie configuration - production vs development
// CRITICAL: secure must be true for cross-origin / HTTPS (Render, Hugging Face, Vercel)
const getRefreshTokenCookieOptions = () => {
    const options = {
        httpOnly: true,                              // Prevents JavaScript access (XSS protection)
        secure: true,                                // Always true - browsers allow secure cookies on localhost if SameSite is Lax/None
        sameSite: 'none',                            // Required for cross-origin cookie sharing between HF and Vercel
        maxAge: 30 * 24 * 60 * 60 * 1000,            // 30 days in milliseconds (Synced with tokenService)
        path: '/',                                   // Cookie available for all paths
    };

    // Add partitioned attribute for modern Chrome cross-site cookie support
    if (isProduction) {
        options.partitioned = true;
    }

    return options;
};

/**
 * Helper to set refresh token as HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - The refresh token to set as cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
    const options = getRefreshTokenCookieOptions();
    console.log('🍪 [CookieUtils] Setting refresh token cookie:', {
        ...options,
        isProduction,
        nodeEnv: process.env.NODE_ENV,
        tokenLength: refreshToken ? refreshToken.length : 0
    });

    res.cookie('refreshToken', refreshToken, options);
}

/**
 * Helper to clear refresh token cookie
 * @param {Object} res - Express response object
 */
function clearRefreshTokenCookie(res) {
    const options = getRefreshTokenCookieOptions();
    delete options.maxAge; // Not needed for clearCookie
    
    console.log('🍪 [CookieUtils] Clearing refresh token cookie with options:', options);
    res.clearCookie('refreshToken', options);
}

module.exports = {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    getRefreshTokenCookieOptions,
    isProduction
};
