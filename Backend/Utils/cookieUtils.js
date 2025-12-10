/**
 * Cookie Utilities for Refresh Token Management
 * Separated to avoid circular dependencies between User controller and authRoutes
 */

// Environment check for cookie settings
const isProduction = process.env.NODE_ENV === 'production';

// Cookie configuration - production vs development
// CRITICAL: secure must be false on localhost (HTTP), true on Render (HTTPS)
// CRITICAL: sameSite must be 'lax' on localhost, 'none' for cross-origin
const getRefreshTokenCookieOptions = () => ({
    httpOnly: true,                              // Prevents JavaScript access (XSS protection)
    secure: isProduction,                        // true on Render (HTTPS), false on localhost (HTTP)
    sameSite: isProduction ? 'none' : 'lax',     // 'none' for cross-origin, 'lax' for same-origin
    maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 days in milliseconds
    path: '/',                                   // Cookie available for all paths
});

/**
 * Helper to set refresh token as HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - The refresh token to set as cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
    const options = getRefreshTokenCookieOptions();
    console.log('🍪 [CookieUtils] Setting refresh token cookie:', {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        maxAge: options.maxAge,
        isProduction,
        nodeEnv: process.env.NODE_ENV,
        tokenLength: refreshToken ? refreshToken.length : 0
    });

    res.cookie('refreshToken', refreshToken, options);
    console.log('🍪 [CookieUtils] Cookie set successfully');
}

/**
 * Helper to clear refresh token cookie
 * @param {Object} res - Express response object
 */
function clearRefreshTokenCookie(res) {
    console.log('🍪 [CookieUtils] Clearing refresh token cookie');
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
}

module.exports = {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    getRefreshTokenCookieOptions,
    isProduction
};
