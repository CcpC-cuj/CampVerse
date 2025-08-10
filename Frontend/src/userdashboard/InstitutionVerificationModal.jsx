import React, { useState } from "react";

const InstitutionVerificationModal = ({ visible, onClose }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Handle submission logic here (API call, validation, etc.)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Verification submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50">
      <div className="glass-card rounded-xl p-6 max-w-xl w-full mx-4 bg-slate-800">
        {/* Success Notification */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-center">
            <i className="ri-check-line mr-2"></i>
            Verification submitted successfully!
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Institution Verification
          </h2>
          <p className="text-slate-300">
            Please provide your institution details for verification
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Institution Name", type: "text", name: "institution" },
            { label: "Official Email", type: "email", name: "email" },
            { label: "Institution Website", type: "url", name: "website" },
            { label: "Contact Number", type: "tel", name: "phone" },
          ].map(({ label, type, name }) => (
            <div key={name}>
              <label className="block text-slate-300 text-sm mb-2">{label}</label>
              <input
                type={type}
                name={name}
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          ))}
          <div>
            <label className="block text-slate-300 text-sm mb-2">
              Institution Type
            </label>
            <select
              name="type"
              required
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary pr-8"
            >
              <option value="">Select Type</option>
              <option value="university">University</option>
              <option value="college">College</option>
              <option value="school">School</option>
              <option value="institute">Training Institute</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-2">
              Additional Information
            </label>
            <textarea
              name="info"
              rows="3"
              maxLength="500"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-6 py-2 rounded-button transition-colors ${
                isSubmitting 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-primary hover:bg-blue-600'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                'Submit for Verification'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border border-slate-700 text-slate-300 hover:text-white px-6 py-2 rounded-button disabled:opacity-50"
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstitutionVerificationModal;
