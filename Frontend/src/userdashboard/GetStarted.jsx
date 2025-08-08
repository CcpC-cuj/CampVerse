// src/userdashboard/GetStarted.jsx
import React, { useState } from 'react';
import InstitutionVerificationModal from '../components/InstitutionVerificationModal';

const GetStarted = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleVerificationSubmit = (formData) => {
    console.log("Submitted data:", formData);
    // TODO: Call backend API here
    setModalOpen(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
      <h2 className="text-2xl font-bold text-white mb-4">Welcome to CampVerse 🎉</h2>
      <p className="text-slate-300 mb-6">Let’s get your institution verified to unlock full access.</p>
      
      <button
        className="bg-primary text-white px-6 py-2 rounded-lg"
        onClick={() => setModalOpen(true)}
      >
        Verify Your Institution
      </button>

      <InstitutionVerificationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleVerificationSubmit}
      />
    </div>
  );
};

export default GetStarted;
