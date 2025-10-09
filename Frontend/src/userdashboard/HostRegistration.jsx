import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar"; // reuse your dashboard sidebar
import { useAuth } from "../contexts/AuthContext";
import { requestHostAccess } from "../api/user";

const HostRegistration = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const email = params.get("email") || user?.email || "";

  const [idCardFile, setIdCardFile] = useState(null);
  const [eventPermissionFile, setEventPermissionFile] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleIdCardChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("ID card file must be less than 2MB");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
        setError("ID card must be an image (JPEG, PNG) or PDF");
        return;
      }
      setIdCardFile(file);
      setError("");
    }
  };

  const handleEventPermissionChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Event permission file must be less than 2MB");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
        setError("Event permission must be an image (JPEG, PNG) or PDF");
        return;
      }
      setEventPermissionFile(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!idCardFile) {
      setError("ID card photo is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("idCardPhoto", idCardFile);
      if (eventPermissionFile) {
        formData.append("eventPermission", eventPermissionFile);
      }
      if (remarks) {
        formData.append("remarks", remarks);
      }

      // Use the centralized API function that handles auth headers
      const data = await requestHostAccess(formData);

      // Check for error in response
      if (data.error) {
        throw new Error(data.error || "Failed to submit host request");
      }

      setSuccess(true);
      // Refresh user data to get updated hostEligibilityStatus
      if (refreshUser) {
        await refreshUser();
      }
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Host request error:", err);
      setError(err.message || "Failed to submit host request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Only show confirmation if status is 'pending', 'approved', or 'rejected'
  const hostStatus = user?.hostEligibilityStatus?.status;
  if (success || hostStatus === 'pending' || hostStatus === 'approved' || hostStatus === 'rejected') {
    return (
      <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
        <div className="w-64 bg-gray-900 h-full hidden sm:block">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-gray-800/60 border border-gray-700 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-checkbox-circle-line text-green-400 text-4xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-3">Host Request Submitted!</h2>
            <p className="text-gray-300 mb-4">
              Your request to become a host has been submitted successfully. Our team will review your application and notify you via email once it's approved.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 h-full hidden sm:block">
        <Sidebar />
      </div>

      {/* Page */}
      <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Host Registration</h1>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded-lg bg-gray-800/70 hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <i className="ri-arrow-left-line"></i>
              <span>Back</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-300 mb-6">
              To become a host on CampVerse, please upload the required verification documents. Your information will be reviewed by our team before approval.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Email</label>
                <input
                  disabled
                  value={email}
                  className="w-full p-3 rounded-lg bg-gray-900 border border-gray-800 text-gray-400"
                />
              </div>

              {/* ID Card Upload (Required) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  ID Card / Student ID <span className="text-red-400">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-[#9b5de5]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleIdCardChange}
                    className="hidden"
                    id="idCardUpload"
                  />
                  <label
                    htmlFor="idCardUpload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
                    <span className="text-gray-300 text-sm">
                      {idCardFile ? idCardFile.name : "Click to upload ID card"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      JPEG, PNG, or PDF (max 2MB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Event Permission Upload (Optional) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Event Permission Document <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-[#9b5de5]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleEventPermissionChange}
                    className="hidden"
                    id="eventPermissionUpload"
                  />
                  <label
                    htmlFor="eventPermissionUpload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <i className="ri-file-upload-line text-4xl text-gray-400 mb-2"></i>
                    <span className="text-gray-300 text-sm">
                      {eventPermissionFile ? eventPermissionFile.name : "Click to upload permission document"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      JPEG, PNG, or PDF (max 2MB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Remarks (Optional) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Additional Remarks <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Tell us why you want to become a host..."
                  className="w-full p-3 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-[#9b5de5] min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">{remarks.length}/500</p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !idCardFile}
                  className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <i className="ri-loader-4-line animate-spin"></i>}
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-400 mt-6 p-4 bg-gray-900/50 rounded-lg">
              <i className="ri-information-line mr-1"></i>
              <strong>Note:</strong> Your documents will be reviewed by our verification team. You will receive an email notification once your host request is approved or if additional information is needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostRegistration;
