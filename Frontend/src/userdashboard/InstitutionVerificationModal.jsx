import React from "react";

const InstitutionVerificationModal = ({ visible, onClose }) => {
  if (!visible) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle submission logic here (API call, validation, etc.)
    alert("Verification submitted!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50">
      <div className="glass-card rounded-xl p-6 max-w-xl w-full mx-4 bg-slate-800">
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
              className="flex-1 bg-primary text-white px-6 py-2 rounded-button"
            >
              Submit for Verification
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-700 text-slate-300 hover:text-white px-6 py-2 rounded-button"
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
