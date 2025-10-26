import React from "react";

const ArticleModal = ({ open, article, onClose }) => {
  if (!open || !article) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <i className="ri-close-line text-2xl" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-white">{article.title}</h2>
        <div className="text-gray-300 mb-2 text-xs">
          {article.category}
        </div>
        <div className="text-gray-200 whitespace-pre-line">{article.body}</div>
      </div>
    </div>
  );
};

export default ArticleModal;
