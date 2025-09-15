import React, { useState } from "react";

const DeleteEventModal = ({ isOpen, onClose, onEventDeleted, event }) => {
  const [loading, setLoading] = useState(false);

  const handleDeleteEvent = async () => {
    try {
      setLoading(true);
      
      // TODO: Call backend API to delete the event here
      // Uncomment the following lines when ready to integrate with backend:
      /*
      try {
        const response = await deleteEvent(event._id);
        
        if (response.success) {
          onClose();
          onEventDeleted();
          alert('Event deleted successfully!');
        } else {
          console.error('Delete event response:', response);
          alert(response.error || response.message || 'Failed to delete event');
        }
      } catch (err) {
        console.error('Error deleting event:', err);
        alert('Failed to delete event: ' + err.message);
      }
      */
      
      // Simulate API call with a delay to mimic network request
      setTimeout(() => {
        onClose();
        onEventDeleted();
        alert('Event deleted successfully!');
      }, 1000);
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Delete Event</h3>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete the event <strong className="text-white">"{event.title}"</strong>? 
            This action cannot be undone.
          </p>
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-300 text-sm">
                <strong>Warning:</strong> All event data, including participant information and registrations, will be permanently deleted.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDeleteEvent}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Event'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteEventModal;