import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axiosInstance";
import { useToast } from "../components/Toast";
import ErrorBoundary from "../components/ErrorBoundary";
import { CERTIFICATE_TYPES, VERIFICATION_STATUS } from "../constants/statuses";
import {
  getCertificateProgress,
  generateBatchCertificates,
  retryCertificateGeneration,
  bulkRetryFailedCertificates,
  sendCertificateNotification,
} from "../api/certificates";

const CAMPVERSE_LOGO_URL = "/logo.png";

const createDefaultLayers = () => [
  {
    id: "title",
    name: "Title",
    type: "text",
    text: "Certificate of {event_name}",
    x: 8,
    y: 10,
    fontSize: 18,
    fontWeight: 600,
    color: "#6b7280",
    align: "left",
  },
  {
    id: "recipient",
    name: "Recipient Name",
    type: "text",
    text: "{name}",
    x: 8,
    y: 28,
    fontSize: 32,
    fontWeight: 700,
    color: "#7c3aed",
    align: "left",
  },
  {
    id: "role",
    name: "Role",
    type: "text",
    text: "{role}",
    x: 8,
    y: 38,
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    align: "left",
  },
  {
    id: "award",
    name: "Award Text",
    type: "text",
    text: "{award_text}",
    x: 8,
    y: 52,
    fontSize: 16,
    fontWeight: 400,
    color: "#374151",
    align: "left",
  },
];

const badgeStyles = {
  approved: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  pending: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  default: "bg-slate-500/20 text-slate-200 border-slate-400/40",
};

const Modal = ({ open, onClose, title, children, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="py-5">{children}</div>
        {actions && <div className="flex justify-end gap-3">{actions}</div>}
      </div>
    </div>
  );
};

const CertificateManagement = () => {
  const { eventId } = useParams();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [certificateType, setCertificateType] = useState(
    CERTIFICATE_TYPES.PARTICIPATION
  );
  const [awardText, setAwardText] = useState("");
  const [leftSignatory, setLeftSignatory] = useState({ name: "", title: "" });
  const [rightSignatory, setRightSignatory] = useState({ name: "", title: "" });

  const [verificationStatus, setVerificationStatus] = useState(
    VERIFICATION_STATUS.NOT_CONFIGURED
  );
  const [rejectionReason, setRejectionReason] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [certificateTemplates, setCertificateTemplates] = useState([]);

  const [leftLogoFile, setLeftLogoFile] = useState(null);
  const [leftSignatureFile, setLeftSignatureFile] = useState(null);
  const [rightSignatureFile, setRightSignatureFile] = useState(null);

  const [certificateStatus, setCertificateStatus] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [generationProgress, setGenerationProgress] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [autoPolling, setAutoPolling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  const [previewName, setPreviewName] = useState("Alex Johnson");
  const [previewRole, setPreviewRole] = useState("Participant");
  const [previewAccent, setPreviewAccent] = useState("#7c3aed");
  const [layers] = useState(() => createDefaultLayers());
  const [, setActiveLayerId] = useState("recipient");
  const [, setDraggingLayer] = useState(null);
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [draggingAsset, setDraggingAsset] = useState(null);
  const [assetPositions, setAssetPositions] = useState({
    orgLogo: { x: 10, y: 18 },
    campverseLogo: { x: 90, y: 10 },
    leftSignature: { x: 15, y: 86 },
    rightSignature: { x: 85, y: 86 },
  });

  useEffect(() => {
    fetchEventDetails();
    fetchCertificateStatus();
    fetchTemplates();
  }, [eventId]);

  useEffect(() => {
    if (!selectedTemplateId || certificateTemplates.length === 0) return;
    const match = certificateTemplates.find(
      (template) => template.id === selectedTemplateId || template._id === selectedTemplateId
    );
    if (match) {
      setSelectedTemplate(match);
    }
  }, [selectedTemplateId, certificateTemplates]);

  useEffect(() => {
    if (!autoPolling) return;
    let isMounted = true;

    const pollProgress = async () => {
      try {
        const res = await getCertificateProgress(eventId);
        const data = res?.data || res || null;
        if (isMounted) {
          setProgressData(data);
        }

        const total =
          data?.total || data?.totalAttended || certificateStatus?.totalAttended || 0;
        const generated = data?.generated || data?.totalGenerated || 0;
        const status = (data?.status || data?.generationStatus || "").toLowerCase();
        const isComplete =
          status.includes("complete") ||
          status.includes("done") ||
          status.includes("finished") ||
          (total > 0 && generated >= total);

        if (isMounted && isComplete) {
          setAutoPolling(false);
          fetchCertificateStatus();
        }
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to refresh progress.");
          setAutoPolling(false);
        }
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [autoPolling, eventId, certificateStatus, toast]);

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/api/admin/certificate-templates");
      setCertificateTemplates(response.data.templates || []);
    } catch (err) {
      toast.error("Failed to load templates.");
    }
  };

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/api/events/${eventId}`);
      const eventData = response.data?.data || response.data;
      setEvent(eventData);
      setCertificateEnabled(eventData.features?.certificateEnabled || false);

      if (eventData.certificateSettings) {
        setCertificateType(
          eventData.certificateSettings.certificateType || CERTIFICATE_TYPES.PARTICIPATION
        );
        setAwardText(eventData.certificateSettings.awardText || "");
        setLeftSignatory(
          eventData.certificateSettings.leftSignatory || { name: "", title: "" }
        );
        setRightSignatory(
          eventData.certificateSettings.rightSignatory || { name: "", title: "" }
        );
        setVerificationStatus(
          eventData.certificateSettings.verificationStatus || VERIFICATION_STATUS.NOT_CONFIGURED
        );
        setRejectionReason(eventData.certificateSettings.rejectionReason || "");
        if (eventData.certificateSettings.previewConfig) {
          const previewConfig = eventData.certificateSettings.previewConfig;
          setPreviewName(previewConfig.previewName || "Alex Johnson");
          setPreviewRole(previewConfig.previewRole || "Participant");
          setPreviewAccent(previewConfig.accentColor || "#7c3aed");
          if (previewConfig.assetPositions) {
            setAssetPositions((prev) => ({
              ...prev,
              ...previewConfig.assetPositions,
            }));
          }
        }
        if (eventData.certificateSettings.selectedTemplateId) {
          setSelectedTemplateId(eventData.certificateSettings.selectedTemplateId);
        } else {
          setSelectedTemplateId(null);
          setSelectedTemplate(null);
        }
      }

      setLoading(false);
    } catch (err) {
      toast.error("Failed to load event details.");
      setLoading(false);
    }
  };

  const fetchCertificateStatus = async () => {
    try {
      const response = await api.get(`/api/certificate-management/events/${eventId}/status`);
      setCertificateStatus(response.data);
      setParticipants(response.data.participants || []);
    } catch (err) {
      // ignore
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.patch(`/api/certificate-management/events/${eventId}/settings`, {
        certificateEnabled,
        certificateType,
        awardText,
        leftSignatory,
        rightSignatory,
        selectedTemplateId: selectedTemplate?.id || selectedTemplate?._id,
        previewConfig: {
          previewName,
          previewRole,
          accentColor: previewAccent,
          assetPositions,
        },
      });
      toast.success("Certificate settings updated successfully!");
      setSettingsDialogOpen(false);
      fetchEventDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update settings");
    }
  };

  const handleSubmitForVerification = async () => {
    try {
      await api.post(`/api/certificate-management/events/${eventId}/submit`, {});
      toast.success("Submitted for verification!");
      fetchEventDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit for verification");
    }
  };

  const handleUploadAssets = async () => {
    try {
      if (leftLogoFile) {
        const formData = new FormData();
        formData.append("files", leftLogoFile);
        formData.append("assetType", "logo");
        formData.append("logo_type", "left");
        await api.post(`/api/certificate-management/events/${eventId}/upload-assets`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (leftSignatureFile) {
        const formData = new FormData();
        formData.append("files", leftSignatureFile);
        formData.append("assetType", "signature");
        formData.append("signature_type", "left");
        await api.post(`/api/certificate-management/events/${eventId}/upload-assets`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (rightSignatureFile) {
        const formData = new FormData();
        formData.append("files", rightSignatureFile);
        formData.append("assetType", "signature");
        formData.append("signature_type", "right");
        await api.post(`/api/certificate-management/events/${eventId}/upload-assets`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("Assets uploaded successfully!");
      setUploadDialogOpen(false);
      setLeftLogoFile(null);
      setLeftSignatureFile(null);
      setRightSignatureFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload assets");
    }
  };

  const handleGenerateCertificates = async () => {
    try {
      setGenerationProgress(true);
      const response = await api.post(`/api/certificate-management/events/${eventId}/generate`, {});
      setAutoPolling(true);
      toast.success(`Successfully generated ${response.data.totalGenerated} certificate(s)!`);
      setGenerationProgress(false);
      fetchCertificateStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate certificates");
      setGenerationProgress(false);
    }
  };

  const handleRegenerateCertificates = async () => {
    try {
      setGenerationProgress(true);
      const response = await api.post(`/api/certificate-management/events/${eventId}/regenerate`, {});
      setAutoPolling(true);
      toast.success("Certificates regenerated successfully!");
      setGenerationProgress(false);
      fetchCertificateStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to regenerate certificates");
      setGenerationProgress(false);
    }
  };

  const handleCheckProgress = async () => {
    try {
      setActionLoading(true);
      const res = await getCertificateProgress(eventId);
      setProgressData(res?.data || res || null);
      toast.info("Progress loaded.");
    } catch (err) {
      toast.error("Failed to load progress.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setActionLoading(true);
      const res = await generateBatchCertificates({ eventId });
      setAutoPolling(true);
      toast.info(res?.message || "Batch generation started.");
      fetchCertificateStatus();
    } catch {
      toast.error("Batch generation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRetryFailed = async () => {
    try {
      setActionLoading(true);
      const res = await bulkRetryFailedCertificates(eventId);
      toast.info(res?.message || "Retry initiated for failed certificates.");
    } catch {
      toast.error("Bulk retry failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotifyCertificate = async (certificateId) => {
    try {
      setActionLoading(true);
      const res = await sendCertificateNotification(certificateId);
      toast.success(res?.message || "Notification sent.");
    } catch {
      toast.error("Failed to send notification.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetrySingle = async (certificateId) => {
    try {
      setActionLoading(true);
      const res = await retryCertificateGeneration(certificateId);
      toast.info(res?.message || "Retry started.");
    } catch {
      toast.error("Retry failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const resolveLayerText = (text) => {
    if (!text) return "";
    return text
      .replaceAll("{name}", previewName)
      .replaceAll("{event_name}", event?.title || "Sample Event")
      .replaceAll("{role}", previewRole)
      .replaceAll("{award_text}", awardText || "");
  };

  const updateLayer = (layerId, updates) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    );
  };


  const handleAssetPointerDown = (event, assetId) => {
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    setDraggingAsset({
      id: assetId,
      offsetX,
      offsetY,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
    setActiveAssetId(assetId);
    setActiveLayerId(null);
  };

  const handlePreviewPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (draggingAsset) {
      setAssetPositions((prev) => ({
        ...prev,
        [draggingAsset.id]: {
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        },
      }));
    }
  };

  const handlePreviewPointerUp = () => {
    if (draggingAsset) {
      setDraggingAsset(null);
    }
  };

  const progressStats = useMemo(() => {
    const total =
      progressData?.total ||
      progressData?.totalAttended ||
      certificateStatus?.totalAttended ||
      0;
    const generated =
      progressData?.generated ||
      progressData?.totalGenerated ||
      certificateStatus?.certificatesGenerated ||
      0;
    const percentage = total > 0 ? Math.min(100, Math.round((generated / total) * 100)) : 0;
    const rawStatus = (progressData?.status || progressData?.generationStatus || "").toLowerCase();
    const isComplete =
      rawStatus.includes("complete") ||
      rawStatus.includes("done") ||
      rawStatus.includes("finished") ||
      (total > 0 && generated >= total);
    const isActive =
      rawStatus.includes("generat") ||
      rawStatus.includes("process") ||
      rawStatus.includes("running") ||
      rawStatus.includes("in_progress");

    return { total, generated, percentage, rawStatus, isComplete, isActive };
  }, [progressData, certificateStatus]);

  const uploadedAssets = event?.certificateSettings?.uploadedAssets || {};
  const leftSignatureUrl = leftSignatory?.signatureUrl || uploadedAssets.leftSignature;
  const rightSignatureUrl = rightSignatory?.signatureUrl || uploadedAssets.rightSignature;
  const orgLogoUrl = uploadedAssets.organizationLogo;
  const awardHasName = awardText?.includes("{name}");
  const awardHasRole = awardText?.includes("{role}");

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-950">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="h-2 w-full animate-pulse rounded-full bg-slate-800" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const verificationBadge =
    badgeStyles[verificationStatus?.toLowerCase()] || badgeStyles.default;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-400">Host Dashboard</p>
              <h1 className="text-3xl font-semibold">Certificate Management</h1>
              <p className="text-sm text-slate-400">
                {event?.title || "Event"} • Event ID: {eventId}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${verificationBadge}`}
              >
                {verificationStatus || "not_configured"}
              </span>
              {rejectionReason && (
                <span className="rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                  {rejectionReason}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSettingsDialogOpen(true)}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:border-purple-400 hover:text-white"
              >
                Configure Settings
              </button>
              <button
                type="button"
                onClick={() => setUploadDialogOpen(true)}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:border-purple-400 hover:text-white"
              >
                Upload Assets
              </button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
              <h2 className="text-xl font-semibold">Certificate Settings</h2>
              <p className="mt-2 text-sm text-slate-400">
                Configure certificate details and submit for verification.
              </p>

              <div className="mt-6 grid gap-6">
                <label className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <span>
                    <p className="font-medium">Enable Certificates</p>
                    <p className="text-xs text-slate-400">Allow attendees to receive certificates.</p>
                  </span>
                  <input
                    type="checkbox"
                    checked={certificateEnabled}
                    onChange={(e) => setCertificateEnabled(e.target.checked)}
                    className="h-5 w-5 accent-purple-500"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-300">Certificate Type</label>
                    <select
                      value={certificateType}
                      onChange={(e) => setCertificateType(e.target.value)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100"
                    >
                      {Object.values(CERTIFICATE_TYPES).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-300">Accent Color</label>
                    <input
                      type="color"
                      value={previewAccent}
                      onChange={(e) => setPreviewAccent(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm text-slate-300">Award Text</label>
                  <textarea
                    value={awardText}
                    onChange={(e) => setAwardText(e.target.value)}
                    rows={4}
                    placeholder="Presented to {name} for {event_name}"
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-slate-700 px-2 py-1">{`{name}`}</span>
                    <span className="rounded-full border border-slate-700 px-2 py-1">{`{event_name}`}</span>
                    <span className="rounded-full border border-slate-700 px-2 py-1">{`{role}`}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-200">Left Signatory</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={leftSignatory.name}
                        onChange={(e) =>
                          setLeftSignatory({ ...leftSignatory, name: e.target.value })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={leftSignatory.title}
                        onChange={(e) =>
                          setLeftSignatory({ ...leftSignatory, title: e.target.value })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-xs text-slate-400">Signature Preview</p>
                      {leftSignatureUrl ? (
                        <img
                          src={leftSignatureUrl}
                          alt="Left Signature"
                          className="mt-2 h-12 w-auto object-contain"
                        />
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No signature uploaded.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setUploadDialogOpen(true)}
                        className="mt-3 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-purple-400"
                      >
                        Upload Signature
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm font-semibold text-slate-200">Right Signatory</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={rightSignatory.name}
                        onChange={(e) =>
                          setRightSignatory({ ...rightSignatory, name: e.target.value })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={rightSignatory.title}
                        onChange={(e) =>
                          setRightSignatory({ ...rightSignatory, title: e.target.value })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-xs text-slate-400">Signature Preview</p>
                      {rightSignatureUrl ? (
                        <img
                          src={rightSignatureUrl}
                          alt="Right Signature"
                          className="mt-2 h-12 w-auto object-contain"
                        />
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No signature uploaded.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setUploadDialogOpen(true)}
                        className="mt-3 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-purple-400"
                      >
                        Upload Signature
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTemplateGalleryOpen(true)}
                    className="rounded-2xl border border-purple-500/50 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-200 hover:border-purple-400"
                  >
                    Choose Template
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateSettings}
                    className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500"
                  >
                    Save Settings
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-300">Verification</span>
                    <span className={`rounded-full border px-3 py-1 text-xs ${verificationBadge}`}>
                      {verificationStatus || "not_configured"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitForVerification}
                      className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
                    >
                      Submit for Verification
                    </button>
                    {rejectionReason && (
                      <span className="text-xs text-rose-200">{rejectionReason}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Live Preview</h2>
                  <p className="text-sm text-slate-400">Preview how the certificate will look.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadDialogOpen(true)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
                >
                  Update Assets
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-white text-slate-900">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: selectedTemplate?.preview
                        ? `url(${selectedTemplate.preview})`
                        : "linear-gradient(135deg, #ede9fe 0%, #fdf2f8 100%)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: selectedTemplate?.preview ? 0.25 : 1,
                    }}
                  />
                  <div
                    className="relative z-10 w-full aspect-[1.414] min-h-[360px]"
                    onPointerMove={handlePreviewPointerMove}
                    onPointerUp={handlePreviewPointerUp}
                    onPointerLeave={handlePreviewPointerUp}
                  >
                    <div className="absolute left-6 top-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Certificate of {certificateType}
                    </div>
                    {orgLogoUrl && (
                      <img
                        src={orgLogoUrl}
                        alt="Organization Logo"
                        onPointerDown={(event) => handleAssetPointerDown(event, "orgLogo")}
                        className={`absolute h-12 cursor-move object-contain ${
                          activeAssetId === "orgLogo" ? "ring-2 ring-purple-400/60" : ""
                        }`}
                        style={{
                          left: `${assetPositions.orgLogo?.x ?? 10}%`,
                          top: `${assetPositions.orgLogo?.y ?? 18}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    )}
                    <img
                      src={CAMPVERSE_LOGO_URL}
                      alt="CampVerse"
                      onPointerDown={(event) => handleAssetPointerDown(event, "campverseLogo")}
                      className={`absolute h-10 cursor-move ${
                        activeAssetId === "campverseLogo" ? "ring-2 ring-purple-400/60" : ""
                      }`}
                      style={{
                        left: `${assetPositions.campverseLogo?.x ?? 90}%`,
                        top: `${assetPositions.campverseLogo?.y ?? 10}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div className="absolute left-1/2 top-28 w-[80%] -translate-x-1/2 text-center">
                      {!awardHasName && (
                        <h3
                          className="text-3xl font-bold"
                          style={{ color: previewAccent }}
                        >
                          {previewName}
                        </h3>
                      )}
                      {!awardHasRole && (
                        <p className="mt-2 text-sm text-slate-600">{previewRole}</p>
                      )}
                      <p className="mt-6 text-base leading-relaxed text-slate-700">
                        {resolveLayerText(awardText) ||
                          "This certificate acknowledges your participation."}
                      </p>
                    </div>

                    {leftSignatureUrl && (
                      <img
                        src={leftSignatureUrl}
                        alt="Left Signature"
                        onPointerDown={(event) => handleAssetPointerDown(event, "leftSignature")}
                        className={`absolute h-10 cursor-move object-contain ${
                          activeAssetId === "leftSignature" ? "ring-2 ring-purple-400/60" : ""
                        }`}
                        style={{
                          left: `${assetPositions.leftSignature?.x ?? 15}%`,
                          top: `${assetPositions.leftSignature?.y ?? 86}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    )}
                    <div className="absolute bottom-6 left-6 text-xs text-slate-500">
                      <div>
                        <p className="font-semibold">{leftSignatory.name || "Left Signatory"}</p>
                        <p>{leftSignatory.title || "Title"}</p>
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-slate-500">
                      <p>{new Date().toLocaleDateString()}</p>
                    </div>
                    {rightSignatureUrl && (
                      <img
                        src={rightSignatureUrl}
                        alt="Right Signature"
                        onPointerDown={(event) => handleAssetPointerDown(event, "rightSignature")}
                        className={`absolute h-10 cursor-move object-contain ${
                          activeAssetId === "rightSignature" ? "ring-2 ring-purple-400/60" : ""
                        }`}
                        style={{
                          left: `${assetPositions.rightSignature?.x ?? 85}%`,
                          top: `${assetPositions.rightSignature?.y ?? 86}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    )}
                    <div className="absolute bottom-6 right-6 text-right text-xs text-slate-500">
                      <p className="font-semibold">{rightSignatory.name || "Right Signatory"}</p>
                      <p>{rightSignatory.title || "Title"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-300">
                  Live preview now reflects the certificate settings directly. Update the
                  Award Text and signatories to change the preview and generator output.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Certificate Operations</h2>
                <p className="text-sm text-slate-400">
                  Manage generation, retries, and progress tracking.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCheckProgress}
                  disabled={actionLoading}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400 disabled:opacity-50"
                >
                  Check Progress
                </button>
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={actionLoading}
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 disabled:opacity-50"
                >
                  Generate Batch
                </button>
                <button
                  type="button"
                  onClick={handleBulkRetryFailed}
                  disabled={actionLoading}
                  className="rounded-full border border-amber-500/50 px-4 py-2 text-sm text-amber-200 hover:border-amber-400 disabled:opacity-50"
                >
                  Retry Failed
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">Generation Progress</p>
                <p className="text-xs text-slate-400">
                  {progressStats.generated}/{progressStats.total}
                </p>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${progressStats.percentage}%` }}
                />
              </div>
              {progressStats.rawStatus && (
                <p className="mt-2 text-xs text-slate-400">Status: {progressStats.rawStatus}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerateCertificates}
                disabled={
                  generationProgress ||
                  verificationStatus !== VERIFICATION_STATUS.APPROVED ||
                  (certificateStatus?.certificatesGenerated || 0) ===
                    (certificateStatus?.totalAttended || 0)
                }
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50"
              >
                Generate Certificates
              </button>
              <button
                type="button"
                onClick={() => setRegenerateDialogOpen(true)}
                disabled={
                  generationProgress ||
                  verificationStatus !== VERIFICATION_STATUS.APPROVED ||
                  (certificateStatus?.certificatesGenerated || 0) === 0
                }
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400 disabled:opacity-50"
              >
                Regenerate All
              </button>
              {verificationStatus !== VERIFICATION_STATUS.APPROVED && (
                <span className="text-xs text-rose-200">
                  Generation locked until configuration is approved by verifier.
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Participants</h2>
                <p className="text-sm text-slate-400">Track certificate generation per attendee.</p>
              </div>
              {generationProgress && (
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
                  Generating...
                </span>
              )}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/70 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Attended At</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.userId} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-100">{participant.name}</td>
                      <td className="px-4 py-3 text-slate-400">{participant.email}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {participant.attendedAt
                          ? new Date(participant.attendedAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            participant.certificateGenerated
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                          }`}
                        >
                          {participant.certificateGenerated ? "Generated" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {participant.certificateGenerated && (
                            <button
                              type="button"
                              onClick={() => window.open(participant.certificateUrl, "_blank")}
                              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-purple-400"
                            >
                              Download
                            </button>
                          )}
                          {participant.certificateId && (
                            <button
                              type="button"
                              onClick={() => handleNotifyCertificate(participant.certificateId)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-purple-400"
                            >
                              Notify
                            </button>
                          )}
                          {!participant.certificateGenerated && participant.certificateId && (
                            <button
                              type="button"
                              onClick={() => handleRetrySingle(participant.certificateId)}
                              className="rounded-full border border-amber-500/50 px-3 py-1 text-xs text-amber-200 hover:border-amber-400"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {participants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No participants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        title="Configure Certificate Settings"
        actions={
          <>
            <button
              type="button"
              onClick={() => setSettingsDialogOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateSettings}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
            >
              Save Settings
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="text-sm text-slate-300">Certificate Type</label>
            <select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
            >
              {Object.values(CERTIFICATE_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-300">Award Text</label>
            <textarea
              value={awardText}
              onChange={(e) => setAwardText(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        title="Upload Certificate Assets"
        actions={
          <>
            <button
              type="button"
              onClick={() => setUploadDialogOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadAssets}
              disabled={!leftLogoFile && !leftSignatureFile && !rightSignatureFile}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              Upload Assets
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">Left Logo (Organization)</p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setLeftLogoFile(e.target.files[0])}
              className="mt-2 text-sm text-slate-200"
            />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">Right Logo (CampVerse)</p>
            <div className="mt-3 flex items-center gap-3">
              <img src={CAMPVERSE_LOGO_URL} alt="CampVerse" className="h-10" />
              <span className="text-xs text-slate-400">Auto-applied on certificates</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">Left Signature</p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setLeftSignatureFile(e.target.files[0])}
              className="mt-2 text-sm text-slate-200"
            />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">Right Signature</p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => setRightSignatureFile(e.target.files[0])}
              className="mt-2 text-sm text-slate-200"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        title="Choose Certificate Template"
        actions={
          <>
            <button
              type="button"
              onClick={() => setTemplateGalleryOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setTemplateGalleryOpen(false)}
              disabled={!selectedTemplate}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              Use Selected Template
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {certificateTemplates.map((template) => {
            const templateId = template.id || template._id;
            const isSelected =
              (selectedTemplate?.id || selectedTemplate?._id) === templateId;
            return (
              <button
                type="button"
                key={templateId}
                onClick={() => {
                  setSelectedTemplate(template);
                  setSelectedTemplateId(templateId);
                }}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  isSelected
                    ? "border-purple-400 shadow-lg shadow-purple-500/20"
                    : "border-slate-800"
                }`}
              >
                <div className="h-36 bg-slate-900">
                  {template.preview ? (
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      Preview Not Available
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-100">{template.name}</p>
                  <span className="mt-1 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                    {template.type}
                  </span>
                </div>
              </button>
            );
          })}
          {certificateTemplates.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-800 p-6 text-center text-sm text-slate-400">
              No templates available.
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        title="Regenerate All Certificates"
        actions={
          <>
            <button
              type="button"
              onClick={() => setRegenerateDialogOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-purple-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setRegenerateDialogOpen(false);
                handleRegenerateCertificates();
              }}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
            >
              Regenerate
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          This will delete all existing certificates and regenerate them. Continue?
        </p>
      </Modal>
    </ErrorBoundary>
  );
};

export default CertificateManagement;
