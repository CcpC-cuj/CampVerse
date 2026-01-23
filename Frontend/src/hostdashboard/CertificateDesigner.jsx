import React, { useState } from "react";

const CAMPVERSE_LOGO_URL = "/logo.png";

const CertificateDesigner = () => {
  const [name, setName] = useState("Alex Johnson");
  const [eventName, setEventName] = useState("CampVerse Summit 2026");
  const [role, setRole] = useState("Participant");
  const [accent, setAccent] = useState("#7c3aed");
  const [awardText, setAwardText] = useState(
    "Presented to {name} for outstanding participation in {event_name}."
  );
  const [leftSignatory, setLeftSignatory] = useState("Dr. John Doe");
  const [leftTitle, setLeftTitle] = useState("Director");
  const [rightSignatory, setRightSignatory] = useState("Prof. Jane Smith");
  const [rightTitle, setRightTitle] = useState("Head of Department");

  const previewText = awardText
    .replaceAll("{name}", name)
    .replaceAll("{event_name}", eventName)
    .replaceAll("{role}", role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
          <h1 className="text-3xl font-semibold">Certificate Designer</h1>
          <p className="mt-2 text-sm text-slate-400">
            Build a visually appealing certificate preview. This page is for design
            preview only.
          </p>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">Recipient Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Event Name</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Award Text</label>
              <textarea
                value={awardText}
                onChange={(e) => setAwardText(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-slate-700 px-2 py-1">{`{name}`}</span>
                <span className="rounded-full border border-slate-700 px-2 py-1">{`{event_name}`}</span>
                <span className="rounded-full border border-slate-700 px-2 py-1">{`{role}`}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">Accent Color</label>
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-800 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Date</label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">Left Signatory</label>
                <input
                  value={leftSignatory}
                  onChange={(e) => setLeftSignatory(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
                <input
                  value={leftTitle}
                  onChange={(e) => setLeftTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Right Signatory</label>
                <input
                  value={rightSignatory}
                  onChange={(e) => setRightSignatory(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
                <input
                  value={rightTitle}
                  onChange={(e) => setRightTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Live Preview</h2>
          <p className="mt-2 text-sm text-slate-400">
            Adjust the fields to see instant changes in the preview.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-white text-slate-900">
            <div className="p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Certificate of Participation
                </span>
                <img src={CAMPVERSE_LOGO_URL} alt="CampVerse" className="h-10" />
              </div>
              <div className="mt-6">
                <h3 className="text-3xl font-bold" style={{ color: accent }}>
                  {name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{role}</p>
                <p className="mt-6 text-base leading-relaxed text-slate-700">
                  {previewText}
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <p className="font-semibold">{leftSignatory}</p>
                  <p>{leftTitle}</p>
                </div>
                <div className="text-center">
                  <p>{eventName}</p>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{rightSignatory}</p>
                  <p>{rightTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
