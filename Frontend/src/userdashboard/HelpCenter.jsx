import React, { useMemo, useState } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "../contexts/AuthContext";
import NavBar from "./NavBar";

/**
 * Help Center (frontend only)
 * - Matches dashboard/landing look (purple accent  #9b5de5).
 * - Sticky top bar with search (like dashboard).
 * - Knowledge Base (filter by search/category)
 * - Quick Actions
 * - Contact Support form (email/ticket) — placeholders added for backend.
 */

// const CATEGORIES = [
//   { id: "getting-started", label: "Getting Started", icon: "ri-rocket-line" },
//   { id: "account", label: "Account & Security", icon: "ri-shield-keyhole-line" },
//   { id: "events", label: "Events & Registration", icon: "ri-calendar-event-line" },
//   { id: "notifications", label: "Notifications", icon: "ri-notification-3-line" },
//   { id: "other", label: "Other", icon: "ri-more-2-line" },
// ];

// const KB = [
//   {
//     id: "kb-otp",
//     category: "account",
//     title: "Didn’t receive verification code (OTP)?",
//     body:
//       "Check your spam folder and make sure your college email is correct. You can resend the OTP from the signup or OTP screen. If it still doesn’t arrive, contact support with your email and college domain.",
//   },
//   {
//     id: "kb-register",
//     category: "events",
//     title: "How to register for an event",
//     body:
//       "Open the event page and click “Register”. If the event requires college verification, ensure your institution is set in your profile and the email domain matches.",
//   },
//   {
//     id: "kb-notifs",
//     category: "notifications",
//     title: "Manage email & in-app notifications",
//     body:
//       "Go to Settings → Notifications to toggle categories like RSVP updates, certificates, co-host requests, and event verification notices.",
//   },
//   {
//     id: "kb-start",
//     category: "getting-started",
//     title: "First steps after creating an account",
//     body:
//       "Complete your profile, upload a photo, pick interests/skills, and set your institution. This improves event recommendations and unlocks registrations.",
//   },
//   {
//     id: "kb-other",
//     category: "other",
//     title: "Report a bug or request a feature",
//     body:
//       "Use the Contact Support form below. Choose “Bug Report” or “Feature Request” and describe what you see or what you’d like added.",
//   },
// ];
const CATEGORIES = [

];


    const KB = [
      {
       
        id: "kb-start",
        category: "getting-started",
        abhi:"Abhi",
        title: "First steps after creating an account",
        body: "Complete your profile, upload a photo, pick interests/skills, and set your institution. This improves event recommendations and unlocks registrations.",
      },
      {
        id: "kb-otp",
        category: "getting-started",
        title: "Didn’t receive verification code (OTP)?",
        body: "Check your spam folder and make sure your college email is correct. You can resend the OTP from the signup or OTP screen. If it still doesn’t arrive, contact support with your email and college domain.",
      },
      {
        id: "kb-register",
        category: "getting-started",
        title: "How to register for an event",
        body: "Open the event page and click “Register”. If the event requires college verification, ensure your institution is set in your profile and the email domain matches.",
      },
      {
        id: "kb-notifs",
        category: "getting-started",
        title: "Manage email & in-app notifications",
        body: "Go to Settings → Notifications to toggle categories like RSVP updates, certificates, co-host requests, and event verification notices.",
      },

      {
        id: "kb-other",
        category: "getting-started",
        title: "Report a bug or request a feature",
        body: "Use the Contact Support form below. Choose “Bug Report” or “Feature Request” and describe what you see or what you’d like added.",
      },
    ];



const HelpCenter = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Top search + category filter
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("getting-started");

  const results = useMemo(() => {
    return KB.filter(
      (a) =>
        (activeCat ? a.category === activeCat : true) &&
        (query
          ? a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.body.toLowerCase().includes(query.toLowerCase())
          : true)
    );
  }, [activeCat, query]);

  // Contact form (frontend only; add your API where indicated)
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    topic: "general",
    subject: "",
    message: "",
    attachment: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const submitTicket = async (e) => {
    e.preventDefault();
    setFeedback("");
    setSubmitting(true);
    try {
      // TODO: BACKEND—create a route & API:
      //  - POST /api/support/tickets
      //  - Body: { name, email, topic, subject, message }, File: attachment (multipart/form-data)
      //  - Returns: { ticketId, message }
      //
      // Example call once you implement:
      // const res = await createSupportTicket(form); // <- implement in ../api
      // setFeedback(res.message || "Ticket created!");

      // Temporary UX: pretend success
      await new Promise((r) => setTimeout(r, 900));
      setFeedback("Thanks! Your message has been received. We’ll get back via email.");
      setForm((f) => ({ ...f, subject: "", message: "", attachment: null }));
    } catch (err) {
      setFeedback("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(""), 3000);
    }
  };

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile Overlay for Sidebar */}
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
        {/* Top Navigation */}
        <NavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={[]}
          searchQuery={query}
          setSearchQuery={setQuery}
        />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45]">
          {/* Heading */}
          <div className="mb-6">
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}
            >
              Help Center
            </h1>
            <p className="text-gray-300 mt-1">
              Find quick answers, browse guides, or reach our support team.
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-3 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-3 py-2 rounded-lg border transition-all ${
                  activeCat === c.id
                    ? "bg-[#9b5de5] border-[#9b5de5] text-white"
                    : "bg-gray-800/60 border-gray-700 text-gray-200 hover:bg-gray-800/80"
                }`}
              >
                <i className={`${c.icon} mr-2`}></i>
                {c.label}
              </button>
            ))}
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Knowledge Base */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {results.length === 0 ? (
                  <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-gray-300">
                    No results. Try a different keyword or category.
                  </div>
                ) : (
                  results.map((a) => (
                    <article
                      key={a.id}
                      className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 hover:border-[#9b5de5]/30 transition-colors"
                    >
                      <div className="mb-2 text-xs text-gray-400 uppercase tracking-wide">
                        {CATEGORIES.find((c) => c.id === a.category)?.label || "Article"}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{a.title}</h3>
                      <p className="text-gray-300">{a.body}</p>
                      {/* TODO: BACKEND—link to a full article route or CMS if needed */}
                    </article>
                  ))
                )}
                </div>
              </div>


            {/* Quick Help / Contact */}
            <aside className="space-y-4">
              {/* Quick Links */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                <div className="space-y-3">
                  <a
                    href="#contact"
                    className="flex items-center justify-start px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-[#9b5de5]/40 hover:bg-gray-900 transition-all text-gray-200 hover:text-white"
                  >
                    <i className="ri-bug-line mr-3 text-lg"></i> 
                    <span>Report a bug</span>
                  </a>
                  <a
                    href="#contact"
                    className="flex items-center justify-start px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-[#9b5de5]/40 hover:bg-gray-900 transition-all text-gray-200 hover:text-white"
                  >
                    <i className="ri-lightbulb-flash-line mr-3 text-lg"></i> 
                    <span>Request a feature</span>
                  </a>
                  {/* TODO: BACKEND—Add route to view user tickets, e.g. /support/tickets */}
                  <button
                    className="w-full flex items-center justify-start px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-[#9b5de5]/40 hover:bg-gray-900 transition-all text-gray-200 hover:text-white"
                    onClick={() => alert("Coming soon: ticket history")}
                  >
                    <i className="ri-file-list-3-line mr-3 text-lg"></i> 
                    <span>View my tickets</span>
                  </button>
                </div>
              </div>

              {/* Contact Form */}
              <div id="contact" className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-3">Contact Support</h4>
                <form onSubmit={submitTicket} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      placeholder="Full name"
                      required
                    />
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      type="email"
                      className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      placeholder="Email address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[#9b5de5] outline-none"
                    >
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="account">Account/OTP</option>
                      <option value="events">Events</option>
                    </select>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                      placeholder="Subject"
                      required
                    />
                  </div>

                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={4}
                    className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                    placeholder="Describe your issue or request…"
                    required
                  />

                  {/* Attachment Section */}
                  <div className="flex items-center justify-start">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[#9b5de5] transition-colors">
                      <i className="ri-attachment-2 text-gray-300"></i>
                      <span className="text-sm text-gray-300">Attach screenshot (optional)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setForm({ ...form, attachment: e.target.files?.[0] || null })
                        }
                      />
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <a
                      href="mailto:support@campverse.app"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#9b5de5]/40 text-[#e9ddff] hover:bg-[#9b5de5]/20 hover:border-[#9b5de5]/60 transition-all font-medium"
                    >
                      <i className="ri-mail-send-line"></i>
                      <span>Mail Instead</span>
                    </a>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#9b5de5] hover:bg-[#8c4be1] disabled:opacity-60 text-white transition-all font-medium min-w-[140px] justify-center"
                    >
                      <i className="ri-send-plane-line"></i>
                      <span>{submitting ? "Sending…" : "Send Message"}</span>
                    </button>
                  </div>

                  {feedback && (
                    <div className="text-sm text-gray-200 bg-gray-900/60 border border-gray-700 rounded-lg p-2">
                      {feedback}
                    </div>
                  )}
                </form>

                {/* TODO: BACKEND—add route for “chat” if planned */}
                {/* <button className="mt-3 w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-[#9b5de5]/40 transition-all">
                  <i className="ri-message-3-line mr-2"></i> Live Chat (coming soon)
                </button> */}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;

