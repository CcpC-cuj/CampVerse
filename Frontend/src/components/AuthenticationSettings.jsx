import React, { useState, useEffect } from 'react';
import { 
  getAuthStatus, 
  setupPassword, 
  changePassword, 
  sendVerificationOtp, 
  verifyOtpForGoogleUser,
  unlinkGoogleAccount,
  forgotPassword
} from '../api';
import { getGoogleToken } from '../utils/googleAuth';

const AuthenticationSettings = () => {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [otpData, setOtpData] = useState({ otp: '' });

  useEffect(() => {
    loadAuthStatus();
  }, []);

  const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

  const loadAuthStatus = async () => {
    try {
      setLoading(true);
      const status = await getAuthStatus();
      const normalized = {
        ...status,
        isVerified: toBool(status?.isVerified),
        hasPassword: toBool(status?.hasPassword),
        googleLinked: toBool(status?.googleLinked),
        needsVerification: toBool(status?.needsVerification),
      };
      setAuthStatus(normalized);
    } catch (err) {
      setError('Failed to load authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      const response = await setupPassword({ newPassword: passwordData.newPassword });
      
      if (response.message) {
        setSuccess(response.message);
        setShowPasswordSetup(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        loadAuthStatus(); // Refresh status
      } else {
        setError(response.error || 'Failed to set up password');
      }
    } catch (err) {
      setError('Failed to set up password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      const response = await changePassword({ 
        currentPassword: passwordData.currentPassword, 
        newPassword: passwordData.newPassword 
      });
      
      if (response.message) {
        setSuccess(response.message);
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      const response = await sendVerificationOtp();
      
      if (response.message) {
        setSuccess(response.message);
        setShowOtpVerification(true);
      } else {
        setError(response.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await verifyOtpForGoogleUser({ otp: otpData.otp });
      
      if (response.message) {
        setSuccess(response.message);
        setShowOtpVerification(false);
        setOtpData({ otp: '' });
        loadAuthStatus(); // Refresh status
      } else {
        setError(response.error || 'Failed to verify account');
      }
    } catch (err) {
      setError('Failed to verify account');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogleStart = () => {
    window.location.href = '/api/auth/link/google';
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleUnlinkGoogle = async () => {
    try {
      setLoading(true);
      const response = await unlinkGoogleAccount();
      if (response.message) {
        setSuccess(response.message);
        await loadAuthStatus();
      } else {
        setError(response.error || 'Failed to unlink Google account');
      }
    } catch (err) {
      setError('Failed to unlink Google account');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      const response = await forgotPassword({ email: authStatus?.email });
      if (response.message) {
        setSuccess(response.message);
        setShowForgotPassword(false);
      } else {
        setError(response.error || 'Failed to send reset link');
      }
    } catch (err) {
      setError('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-purple-600">Loading authentication settings...</div>
      </div>
    );
  }

  if (!authStatus) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load authentication settings
      </div>
    );
  }

  // Derived flags for UI flow
  const hasPassword = !!authStatus?.hasPassword;
  const googleLinked = !!authStatus?.googleLinked;

  const shouldShowSetupPassword = googleLinked && !hasPassword; // Google login with no password
  const shouldShowChangePassword = hasPassword; // Email login or Google user who added a password
  const shouldShowLinkGoogle = hasPassword && !googleLinked; // Email login only
  const shouldShowUnlinkGoogle = googleLinked; // Already linked

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Authentication Settings</h2>
        
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button onClick={clearMessages} className="float-right font-bold">&times;</button>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
            <button onClick={clearMessages} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Authentication Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Current Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${authStatus.isVerified ? 'bg-green-500' : 'bg-red-500'}`}></span>
              Account Verified: {authStatus.isVerified ? 'Yes' : 'No'}
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${hasPassword ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              Password Set: {hasPassword ? 'Yes' : 'No'}
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${googleLinked ? 'bg-green-500' : 'bg-blue-500'}`}></span>
              Google Linked: {googleLinked ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Google-only users: Set up password */}
          {shouldShowSetupPassword && (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Set Up Password</h4>
              <p className="text-yellow-700 mb-3">
                You signed up with Google. Set up a password to also login with email/password for better security.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPasswordSetup(true)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 mr-2"
                >
                  Set Up Password
                </button>
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          )}

          {/* Email-only users: Link Google account */}
          {shouldShowLinkGoogle && (
            <div className="p-4 border border-green-300 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Link Google Account</h4>
              <p className="text-green-700 mb-3">
                Link your college Google account for convenient login options and better integration.
              </p>
              <button
                onClick={handleLinkGoogleStart}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Link Google Account
              </button>
            </div>
          )}

          {/* Users with real password: Change password */}
          {shouldShowChangePassword && (
            <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Change Password</h4>
              <p className="text-blue-700 mb-3">
                Update your email/password for enhanced security. You can also use Google login.
              </p>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Change Password
              </button>
            </div>
          )}

          {/* Users with Google linked: Unlink Google */}
          {shouldShowUnlinkGoogle && (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Unlink Google Account</h4>
              <p className="text-gray-700 mb-3">
                Remove Google login option. You'll still be able to login with email/password.
              </p>
              <button
                onClick={handleUnlinkGoogle}
                disabled={loading}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Unlinking...' : 'Unlink Google'}
              </button>
            </div>
          )}

          {/* Account verification (if needed) */}
          {authStatus.needsVerification && (
            <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Verify Account</h4>
              <p className="text-red-700 mb-3">
                Your account needs verification. Click below to receive a verification code.
              </p>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}
        </div>

        {/* Password Setup Modal */}
        {showPasswordSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Set Up Password</h3>
              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Set Up Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordSetup(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OTP Verification Modal */}
        {showOtpVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Verify Account</h3>
              <p className="text-gray-600 mb-4">
                Enter the verification code sent to your email.
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Verification Code</label>
                  <input
                    type="text"
                    value={otpData.otp}
                    onChange={(e) => setOtpData({otp: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="Enter 6-digit code"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOtpVerification(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Send Password Reset Link</h3>
              <p className="text-gray-600 mb-4">
                We'll send a password reset link to your email address.
              </p>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthenticationSettings;
