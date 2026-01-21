import React, { useState, useEffect } from 'react';
import {
  getAuthStatus,
  setupPassword,
  changePassword,
  sendVerificationOtp,
  verifyOtpForGoogleUser,
  linkGoogleAccount,
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
  const [showGoogleLink, setShowGoogleLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [otpData, setOtpData] = useState({ otp: '' });
  const [googleLinkData, setGoogleLinkData] = useState({ email: '', password: '' });

  useEffect(() => { loadAuthStatus(); }, []);

  const loadAuthStatus = async () => {
    try {
      setLoading(true);
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch {
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
        loadAuthStatus();
      } else {
        setError(response.error || 'Failed to set up password');
      }
    } catch {
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
    } catch {
      setError('Failed to change password');
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
    } catch {
      setError('Failed to send reset link');
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
    } catch {
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
        loadAuthStatus();
      } else {
        setError(response.error || 'Failed to verify account');
      }
    } catch {
      setError('Failed to verify account');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const googleToken = await getGoogleToken();
      const response = await linkGoogleAccount({
        email: googleLinkData.email,
        password: googleLinkData.password,
        token: googleToken
      });
      if (response.message) {
        setSuccess(response.message);
        setShowGoogleLink(false);
        setGoogleLinkData({ email: '', password: '' });
        loadAuthStatus();
      } else {
        setError(response.error || 'Failed to link Google account');
      }
    } catch (err) {
      setError('Failed to link Google account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

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
    } catch {
      setError('Failed to unlink Google account');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authStatus) {
    return (
      <div className="flex items-center justify-center p-8 text-[#9b5de5]">
        Loading authentication settings...
      </div>
    );
  }

  if (!authStatus) {
    return <div className="p-8 text-center text-red-400">Failed to load authentication settings</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-white">
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
        <h2
          className="text-2xl font-bold mb-6"
          style={{ textShadow: '0 0 10px rgba(155, 93, 229, 0.5)' }}
        >
          Authentication Settings
        </h2>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded">
            {error}
            <button onClick={clearMessages} className="float-right font-bold">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-[#9b5de5]/10 border border-[#9b5de5]/30 text-[#e6d8ff] rounded">
            {success}
            <button onClick={clearMessages} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Current Status */}
        <div className="mb-6 p-4 bg-gray-900/40 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Current Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${authStatus.isVerified ? 'bg-[#9b5de5]' : 'bg-gray-500'}`}></span>
              Account Verified: {authStatus.isVerified ? 'Yes' : 'No'}
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${authStatus.hasPassword ? 'bg-[#9b5de5]' : 'bg-gray-500'}`}></span>
              Password Set: {authStatus.hasPassword ? 'Yes' : 'No'}
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${authStatus.googleLinked ? 'bg-[#9b5de5]' : 'bg-gray-500'}`}></span>
              Google Linked: {authStatus.googleLinked ? 'Yes' : 'No'}
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2 bg-[#9b5de5]"></span>
              Google Login: Available
            </div>
          </div>
        </div>

        {/* Action Blocks (neutral cards, purple primary) */}
        <div className="space-y-4">
          {authStatus.needsPasswordSetup && (
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/40">
              <h4 className="font-semibold mb-2">Set Up Password</h4>
              <p className="text-gray-300 mb-3">
                You signed up with Google. Set up a password to also login with email/password.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPasswordSetup(true)}
                  className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button"
                >
                  Set Up Password
                </button>
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          )}

          {authStatus.hasPassword && !authStatus.googleLinked && !authStatus.needsPasswordSetup && (
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/40">
              <h4 className="font-semibold mb-2">Link Google Account</h4>
              <p className="text-gray-300 mb-3">
                Link your college Google account for convenient login.
              </p>
              <button
                onClick={() => setShowGoogleLink(true)}
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button"
              >
                Link Google Account
              </button>
            </div>
          )}

          {authStatus.hasPassword && authStatus.googleLinked && !authStatus.needsPasswordSetup && (
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/40">
              <h4 className="font-semibold mb-2">Change Password</h4>
              <p className="text-gray-300 mb-3">Update your email/password.</p>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button"
              >
                Change Password
              </button>
            </div>
          )}

          {authStatus.hasPassword && authStatus.googleLinked && !authStatus.needsPasswordSetup && (
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/40">
              <h4 className="font-semibold mb-2">Unlink Google Account</h4>
              <p className="text-gray-300 mb-3">
                Remove Google login option. You’ll still be able to login with email/password.
              </p>
              <button
                onClick={handleUnlinkGoogle}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button disabled:opacity-50"
              >
                {loading ? 'Unlinking...' : 'Unlink Google'}
              </button>
            </div>
          )}

          {authStatus.needsVerification && (
            <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/40">
              <h4 className="font-semibold mb-2">Verify Account</h4>
              <p className="text-gray-300 mb-3">
                Your account needs verification. Click below to receive a code.
              </p>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals (dark, purple primary) */}
      {showPasswordSetup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 text-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Up Password</h3>
            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white py-2 rounded-button disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Set Up Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordSetup(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 text-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white py-2 rounded-button disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOtpVerification && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 text-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Verify Account</h3>
            <p className="text-gray-300 mb-4">Enter the verification code sent to your email.</p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Verification Code</label>
                <input
                  type="text"
                  value={otpData.otp}
                  onChange={(e) => setOtpData({ otp: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                  placeholder="Enter 6-digit code"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white py-2 rounded-button disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpVerification(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoogleLink && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 text-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Link Google Account</h3>
            <p className="text-gray-300 mb-4">Enter your credentials to link your Google account.</p>
            <form onSubmit={handleLinkGoogle} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={googleLinkData.email}
                  onChange={(e) => setGoogleLinkData({ ...googleLinkData, email: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input
                  type="password"
                  value={googleLinkData.password}
                  onChange={(e) => setGoogleLinkData({ ...googleLinkData, password: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white py-2 rounded-button disabled:opacity-50"
                >
                  {loading ? 'Linking...' : 'Link Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoogleLink(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 text-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Password Reset Link</h3>
            <p className="text-gray-300 mb-4">We’ll send a password reset link to your email.</p>
            <div className="flex gap-2">
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white py-2 rounded-button disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthenticationSettings;
