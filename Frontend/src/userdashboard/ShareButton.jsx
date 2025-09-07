import React, { useState } from "react";
import { Share2 } from "lucide-react";

const ShareButton = ({ title, description }) => {
  const [open, setOpen] = useState(false);
  const url = window.location.href;

  const shareLinks = {
    WhatsApp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (err) {
        console.error("Native share failed:", err);
      }
    } else {
      setOpen(!open);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleNativeShare}
        className="text-white p-1 rounded-full hover:bg-gray-700"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 z-50">
          <ul className="flex flex-col">
            {Object.entries(shareLinks).map(([platform, link]) => (
              <li key={platform}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-white hover:bg-gray-700 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {platform}
                </a>
              </li>
            ))}
            <li>
              <button
                onClick={handleNativeShare}
                className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
              >
                More...
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
