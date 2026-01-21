// src/pages/OtpModal.jsx
import React, { useState, useRef, useEffect } from "react";

const OtpModal = ({ email, onClose, onVerifyOtp, onResendOtp }) => {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const inputsRef = useRef([]);

  // Countdown
  useEffect(() => {
    if (timer === 0) return;
    const id = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // Focus first input
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Single-digit handling
  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/, "");
    if (!val) return;
    const newOtp = [...otp];
    newOtp[i] = val[0];
    setOtp(newOtp);
    if (error) setError('');
    if (i < 5) inputsRef.current[i + 1].focus();
  };

  // Paste handling
  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");
    const newOtp = Array(6).fill("");
    paste.forEach((ch, idx) => (newOtp[idx] = ch));
    setOtp(newOtp);
    if (error) setError('');
    const next = paste.length >= 6 ? 5 : paste.length;
    inputsRef.current[next]?.focus();
  };

  // Submit OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onVerifyOtp(otp.join(""));
    } catch (err) {
      setError(err?.message || 'Incorrect OTP. Please try again.');
      const cleared = Array(6).fill("");
      setOtp(cleared);
      inputsRef.current[0]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >
          &times;
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Verify Your Email</h2>
          <p className="text-sm text-purple-300">
            Please enter the code sent to your email below.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Check your spam/junk folder if you don’t see it.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div onPaste={handlePaste} className="flex justify-center gap-2 mb-4">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                className="w-12 h-12 bg-transparent border border-purple-500 rounded-lg text-center text-white text-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="block mx-auto w-32 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 rounded-full transition"
          >
            Verify
          </button>
        </form>

        <div className="flex justify-between items-center mt-4 text-sm">
          <button
            onClick={async () => {
              try {
                await onResendOtp();
                setTimer(30);
                setError('');
              } catch (err) {
                setError(err?.message || 'Failed to resend OTP');
              }
            }}
            disabled={timer > 0}
            className={`font-bold text-purple-500 hover:text-purple-400 ${
              timer > 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Resend OTP
          </button>

          {timer > 0 && (
            <span className="text-white">
              Retry in {timer}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpModal;
