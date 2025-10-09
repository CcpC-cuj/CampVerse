import React, { useState } from "react";
import { Share2 } from "lucide-react";

const ShareButton = ({ event, title, description }) => {
  const [open, setOpen] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  
  // Use event object to construct proper URL
  const eventId = event?._id || event?.id;
  const eventTitle = title || event?.title || "Check out this event!";
  const eventDesc = description || event?.description || "";
  
  // Add warning if eventId is missing
  if (!eventId) {
    console.warn('ShareButton: No eventId found. Falling back to current URL. Pass event object with _id or id.');
  }
  
  // Generate shareable URL - use event-specific URL if available
  const baseUrl = window.location.origin;
  const url = eventId ? `${baseUrl}/events/${eventId}` : window.location.href;

  const shareLinks = {
    WhatsApp: `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: eventDesc,
          url: url,
        });
        setOpen(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Native share failed:", err);
        }
      }
    } else {
      setOpen(true);
      setShowCopy(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setShowCopy(false);
      setOpen(false);
    }).catch(err => {
      // ...existing code...
    });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowCopy(true)}
        className="text-white p-2 rounded-full hover:bg-gray-700 transition-colors mr-2"
        title="Copy event link"
      >
        📋
      </button>
      <button
        onClick={handleNativeShare}
        className="text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
        title="Share event"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {showCopy && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4 flex flex-col items-center">
            <div className="mb-2 text-white text-sm">Copy this link:</div>
            <input
              type="text"
              value={url}
              readOnly
              className="w-full px-2 py-1 rounded bg-gray-900 text-white border border-gray-700 mb-2 text-xs"
              onFocus={e => e.target.select()}
            />
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-white bg-[#9b5de5] hover:bg-[#8c4be1] rounded text-sm"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setShowCopy(false)}
              className="mt-2 text-xs text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {open && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 z-50">
            <ul className="flex flex-col py-1">
              {Object.entries(shareLinks).map(([platform, link]) => (
                <li key={platform}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-white hover:bg-gray-700 text-sm transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    Share on {platform}
                  </a>
                </li>
              ))}
              {navigator.share && (
                <li>
                  <button
                    onClick={handleNativeShare}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm transition-colors"
                  >
                    More options...
                  </button>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
