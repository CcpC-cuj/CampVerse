import React, { useState } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "../contexts/AuthContext";

/**
 * Feedback (frontend only)
 * - On-brand UI (purple #9b5de5) matching Dashboard/Settings/Help Center.
 * - Sticky top bar with quick CTAs.
 * - Star rating + category + message + optional screenshot.
 * - "Mail Instead" button (mailto) and placeholders for backend routes/APIs.
 */

const CATEGORIES = [
  { id: "ui", label: "UI/Design", icon: "ri-palette-line" },
  { id: "bug", label: "Bug Report", icon: "ri-bug-line" },
  { id: "feature", label: "Feature Request", icon: "ri-lightbulb-flash-line" },
  { id: "performance", label: "Performance", icon: "ri-speed-up-line" },
  { id: "events", label: "Events", icon: "ri-calendar-event-line" },
  { id: "other", label: "Other", icon: "ri-more-2-line" },
];

const Star = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`text-2xl transition-transform ${filled ? "text-[#ffcc66]" : "text-gray-500"} hover:scale-110`}
    aria-label={filled ? "Selected star" : "Unselected star"}
  >
    <i className={filled ? "ri-star-fill" : "ri-star-line"}></i>
  </button>
);

const Feedback = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // rating states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // form states
  const [category, setCategory] = useState("ui");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [attachment, setAttachment] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");
    setSubmitting(true);

    try {
      // TODO: BACKEND — create Feedback API endpoint
      // POST /api/feedback  (multipart/form-data if attachment present)
      // Body: { rating, category, subject, message, email }
      // File: attachment
      // Example integration after you add it to ../api:
      // const res = await submitFeedback({ rating, category, subject, message, email, attachment })
      // setFeedback(res.message || "Thanks for your feedback!")

      await new Promise((r) => setTimeout(r, 900)); // simulate
      setFeedback("Thanks! Your feedback has been received.");
      setSubject("");
      setMessage("");
      setAttachment(null);
      setRating(0);
    } catch (err) {
      setFeedback("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(""), 3000);
    }
  };

  // mailto helper
  const mailHref = `mailto:support@campverse.app?subject=${encodeURIComponent(
    `Feedback: ${subject || "(no subject)"}`
  )}&body=${encodeURIComponent(
    `Rating: ${rating}/5\nCategory: ${category}\n\n${message}\n\nFrom: ${email || user?.email || ""}`
  )}`;

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-[#0b0f2b] z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0 border-r border-gray-800`}
      >
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 bg-transparent">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl px-4 sm:px-6 py-3">
              {/* Hamburger */}
              <button
                className="sm:hidden p-2 rounded-lg bg-gray-800/70 text-white transition-transform hover:scale-105"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <i className="ri-menu-line text-lg"></i>
              </button>

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#9b5de5]/20 flex items-center justify-center">
                  <i className="ri-feedback-line text-[#9b5de5] text-xl"></i>
                </div>
                <div>
                  <div className="text-lg font-semibold leading-5">Feedback</div>
                  <div className="text-xs text-gray-300">Help us make CampVerse better</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-2 sm:gap-3">
                <a
                  href={mailHref}
                  className="px-3 py-2 rounded-button border border-[#9b5de5]/40 text-[#e9ddff] hover:bg-[#9b5de5]/20 hover:border-[#9b5de5]/60 transition-all"
                >
                  <i className="ri-mail-send-line mr-1"></i> Mail Instead
                </a>
                <a
                  href="#feedback-form"
                  className="px-3 py-2 rounded-button bg-[#9b5de5] hover:bg-[#8c4be1] text-white transition-colors"
                >
                  <i className="ri-edit-2-line mr-1"></i> Write Feedback
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45]">
          {/* Header copy */}
          <div className="mb-6">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}
            >
              We’re listening
            </h1>
            <p className="text-gray-300 mt-1">
              Share bugs, ideas, or love notes. Your input directly shapes our roadmap.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div id="feedback-form" className="lg:col-span-2">
              <form
                onSubmit={onSubmit}
                className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4"
              >
                {/* Rating */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Rate your experience</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        filled={(hoverRating || rating) >= i}
                        onClick={() => setRating(i)}
                        onMouseEnter={() => setHoverRating(i)}
                        onMouseLeave={() => setHoverRating(0)}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-400">{rating}/5</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`px-3 py-2 rounded-lg border transition-all ${
                          category === c.id
                            ? "bg-[#9b5de5] border-[#9b5de5] text-white"
                            : "bg-gray-900/60 border-gray-700 text-gray-200 hover:bg-gray-900"
                        }`}
                      >
                        <i className={`${c.icon} mr-2`}></i>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject/Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Subject</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      placeholder="Short title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      placeholder="you@college.edu"
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                    placeholder="Tell us what’s working great or what we should improve…"
                    required
                  />
                </div>

                {/* Attachment + Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <i className="ri-attachment-2 text-gray-300"></i>
                    <span className="text-sm text-gray-300">Attach screenshot (optional)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <a
                      href={mailHref}
                      className="px-3 py-2 rounded-button border border-[#9b5de5]/40 text-[#e9ddff] hover:bg-[#9b5de5]/20 hover:border-[#9b5de5]/60 transition-all"
                    >
                      <i className="ri-mail-line mr-1"></i> Mail Instead
                    </a>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-button bg-[#9b5de5] hover:bg-[#8c4be1] disabled:opacity-60 text-white transition-all"
                    >
                      {submitting ? "Sending…" : "Submit Feedback"}
                    </button>
                  </div>
                </div>

                {feedback && (
                  <div className="text-sm text-gray-200 bg-gray-900/60 border border-gray-700 rounded-lg p-2">
                    {feedback}
                  </div>
                )}
              </form>

              {/* TODO: BACKEND — optionally show recent feedback or status list for the user here */}
            </div>

            {/* Side info */}
            <aside className="space-y-4">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-2">What happens next?</h4>
                <p className="text-gray-300 text-sm">
                  Your feedback is triaged by our team. Critical bugs are prioritized,
                  feature requests are reviewed for roadmap, and UI tweaks are bundled
                  into upcoming sprints.
                </p>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-2">Tips for great feedback</h4>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Include steps to reproduce (for bugs)</li>
                  <li>Add screenshots where helpful</li>
                  <li>Tell us your goal (why you need the change)</li>
                </ul>
              </div>
              {/* TODO: BACKEND — link to public changelog once available */}
              <button
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-[#9b5de5]/40 hover:bg-gray-900 transition-all"
                onClick={() => alert("Coming soon: Public changelog")}
              >
                <i className="ri-timeline-view mr-2"></i>
                View Changelog (coming soon)
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
