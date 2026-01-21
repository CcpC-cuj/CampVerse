import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useToast } from '../components/Toast';
import ErrorBoundary from '../components/ErrorBoundary';
import { CERTIFICATE_TYPES, VERIFICATION_STATUS } from '../constants/statuses';
import {
  getCertificateProgress,
  generateBatchCertificates,
  retryCertificateGeneration,
  bulkRetryFailedCertificates,
  sendCertificateNotification,
} from '../api/certificates';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
} from '@mui/material';
import {
  CloudUpload,
  Download,
  Refresh,
  CheckCircle,
  Cancel,
  Settings,
  Preview,
  FileUpload,
} from '@mui/icons-material';

// Predefined certificate templates from cloud storage
// Templates will be fetched from API

// CampVerse logo URL (always used on right side)
const CAMPVERSE_LOGO_URL = '/logo.png';

const CertificateManagement = ({ eventId }) => {
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Certificate settings
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [certificateType, setCertificateType] = useState(CERTIFICATE_TYPES.PARTICIPATION);
  const [awardText, setAwardText] = useState('');
  const [leftSignatory, setLeftSignatory] = useState({ name: '', title: '' });
  const [rightSignatory, setRightSignatory] = useState({ name: '', title: '' });
  
  // Verification Status
  const [verificationStatus, setVerificationStatus] = useState(VERIFICATION_STATUS.NOT_CONFIGURED);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Selected Template (Chosen from Admin Templates)
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Upload states
  const [leftLogoFile, setLeftLogoFile] = useState(null);
  const [leftSignatureFile, setLeftSignatureFile] = useState(null);
  const [rightSignatureFile, setRightSignatureFile] = useState(null);
  
  // Status
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [generationProgress, setGenerationProgress] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [certificateIdInput, setCertificateIdInput] = useState('');
  const [autoPolling, setAutoPolling] = useState(false);
  
  // Dialogs
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // Templates State
  const [certificateTemplates, setCertificateTemplates] = useState([]);

  useEffect(() => {
    fetchEventDetails();
    fetchCertificateStatus();
  }, [eventId]);

  useEffect(() => {
    if (templateGalleryOpen) {
      fetchTemplates();
    }
  }, [templateGalleryOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/admin/certificate-templates');
      setCertificateTemplates(response.data.templates || []);
    } catch (err) {
      toast.error('Failed to load templates.');
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
    const rawStatus = (progressData?.status || progressData?.generationStatus || '').toLowerCase();
    const isComplete =
      rawStatus.includes('complete') ||
      rawStatus.includes('done') ||
      rawStatus.includes('finished') ||
      (total > 0 && generated >= total);
    const isActive =
      rawStatus.includes('generat') ||
      rawStatus.includes('process') ||
      rawStatus.includes('running') ||
      rawStatus.includes('in_progress');

    return { total, generated, percentage, rawStatus, isComplete, isActive };
  }, [progressData, certificateStatus]);

  const certificateOptions = useMemo(() => {
    return (participants || [])
      .map((participant) => {
        const id =
          participant.certificateId ||
          participant.certificate?._id ||
          participant.certificate?.id;

        if (!id) return null;

        return {
          id,
          label: `${participant.name || 'Unknown'} • ${participant.email || 'N/A'}`,
        };
      })
      .filter(Boolean);
  }, [participants]);

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

        const total = data?.total || data?.totalAttended || certificateStatus?.totalAttended || 0;
        const generated = data?.generated || data?.totalGenerated || 0;
        const status = (data?.status || data?.generationStatus || '').toLowerCase();
        const isComplete =
          status.includes('complete') ||
          status.includes('done') ||
          status.includes('finished') ||
          (total > 0 && generated >= total);

        if (isMounted && isComplete) {
          setAutoPolling(false);
          fetchCertificateStatus();
        }
      } catch (err) {
        if (isMounted) {
          toast.error('Failed to refresh progress.');
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

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/api/events/${eventId}`);
      
      const eventData = response.data?.data || response.data;
      setEvent(eventData);
      setCertificateEnabled(eventData.features?.certificateEnabled || false);
      
      if (eventData.certificateSettings) {
        setCertificateType(eventData.certificateSettings.certificateType || CERTIFICATE_TYPES.PARTICIPATION);
        setAwardText(eventData.certificateSettings.awardText || '');
        setLeftSignatory(eventData.certificateSettings.leftSignatory || { name: '', title: '' });
        setRightSignatory(eventData.certificateSettings.rightSignatory || { name: '', title: '' });
        setVerificationStatus(eventData.certificateSettings.verificationStatus || VERIFICATION_STATUS.NOT_CONFIGURED);
        setRejectionReason(eventData.certificateSettings.rejectionReason || '');
        
        // Find selected template from gallery if ID exists
        if (eventData.certificateSettings.selectedTemplateId) {
          // Templates will be loaded later, or we can fetch them here if needed
          // For now, we rely on the ID being present
          // We can't search certificateTemplates here because it might be empty
        }
      }
      
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load event details.');
      setLoading(false);
    }
  };

  const fetchCertificateStatus = async () => {
    try {
      const response = await api.get(`/api/certificate-management/events/${eventId}/status`);
      
      setCertificateStatus(response.data);
      setParticipants(response.data.participants || []);
    } catch (err) {
      // Failed to fetch certificate status - silently ignore
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.patch(
        `/api/certificate-management/events/${eventId}/settings`,
        {
          certificateEnabled,
          certificateType,
          awardText,
          leftSignatory,
          rightSignatory,
          selectedTemplateId: selectedTemplate?.id,
        }
      );
      toast.success('Certificate settings updated successfully!');
      setSettingsDialogOpen(false);
      fetchEventDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const handleSubmitForVerification = async () => {
    try {
      await api.post(`/api/certificate-management/events/${eventId}/submit`, {});
      toast.success('Submitted for verification!');
      fetchEventDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit for verification');
    }
  };

  const handleUploadAssets = async () => {
    try {
      // Upload logos (left only - right is fixed)
      if (leftLogoFile) {
        const formData = new FormData();
        formData.append('files', leftLogoFile);
        formData.append('assetType', 'logo');
        formData.append('logo_type', 'left');
        
        await api.post(
          `/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      // Upload signatures
      if (leftSignatureFile) {
        const formData = new FormData();
        formData.append('files', leftSignatureFile);
        formData.append('assetType', 'signature');
        formData.append('signature_type', 'left');
        
        await api.post(
          `/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      if (rightSignatureFile) {
        const formData = new FormData();
        formData.append('files', rightSignatureFile);
        formData.append('assetType', 'signature');
        formData.append('signature_type', 'right');
        
        await api.post(
          `/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      toast.success('Assets uploaded successfully!');
      setUploadDialogOpen(false);
      
      // Reset file states
      setLeftLogoFile(null);
      setLeftSignatureFile(null);
      setRightSignatureFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload assets');
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
      toast.error(err.response?.data?.error || 'Failed to generate certificates');
      setGenerationProgress(false);
    }
  };

  const handleRegenerateCertificates = async () => {
    try {
      setGenerationProgress(true);
      
      const response = await api.post(`/api/certificate-management/events/${eventId}/regenerate`, {});
      setAutoPolling(true);
      toast.success('Certificates regenerated successfully!');
      setGenerationProgress(false);
      fetchCertificateStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to regenerate certificates');
      setGenerationProgress(false);
    }
  };

  const handleCheckProgress = async () => {
    try {
      setActionLoading(true);
      const res = await getCertificateProgress(eventId);
      setProgressData(res?.data || res || null);
      toast.info('Progress loaded.');
    } catch (err) {
      toast.error('Failed to load progress.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setActionLoading(true);
      const res = await generateBatchCertificates({ eventId });
      setAutoPolling(true);
      toast.info(res?.message || 'Batch generation started.');
      fetchCertificateStatus();
    } catch {
      toast.error('Batch generation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRetryFailed = async () => {
    try {
      setActionLoading(true);
      const res = await bulkRetryFailedCertificates(eventId);
      toast.info(res?.message || 'Retry initiated for failed certificates.');
    } catch {
      toast.error('Bulk retry failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotifyCertificate = async (certificateId) => {
    try {
      setActionLoading(true);
      const res = await sendCertificateNotification(certificateId);
      toast.success(res?.message || 'Notification sent.');
    } catch {
      toast.error('Failed to send notification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetrySingle = async (certificateId) => {
    try {
      setActionLoading(true);
      const res = await retryCertificateGeneration(certificateId);
      toast.info(res?.message || 'Retry started.');
    } catch {
      toast.error('Retry failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <LinearProgress />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Certificate Management
      </Typography>

      {/* Certificate Operations */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Certificate Operations</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Button variant="outlined" onClick={handleCheckProgress} disabled={actionLoading}>
              Check Progress
            </Button>
            <Button variant="contained" color="primary" onClick={handleGenerateBatch} disabled={actionLoading}>
              Generate Batch
            </Button>
            <Button variant="outlined" color="warning" onClick={handleBulkRetryFailed} disabled={actionLoading}>
              Retry Failed
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Autocomplete
              size="small"
              options={certificateOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
              value={certificateOptions.find((option) => option.id === certificateIdInput) || null}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setCertificateIdInput(newValue);
                } else {
                  setCertificateIdInput(newValue?.id || '');
                }
              }}
              inputValue={certificateIdInput}
              onInputChange={(event, newInputValue) => setCertificateIdInput(newInputValue)}
              freeSolo
              renderInput={(params) => (
                <TextField {...params} label="Certificate" placeholder="Search by name or email" />
              )}
              sx={{ minWidth: 320 }}
              noOptionsText="No certificates available"
            />
            <Button
              variant="outlined"
              onClick={() => certificateIdInput && handleRetrySingle(certificateIdInput)}
              disabled={actionLoading || !certificateIdInput}
            >
              Retry Single
            </Button>
            <Button
              variant="outlined"
              onClick={() => certificateIdInput && handleNotifyCertificate(certificateIdInput)}
              disabled={actionLoading || !certificateIdInput}
            >
              Send Notification
            </Button>
          </Box>

          {progressData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status: {progressData.status || progressData.generationStatus || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generated: {progressStats.generated} / {progressStats.total}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressStats.percentage}
                sx={{ mt: 1, height: 8, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {progressStats.percentage}% complete
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Certificate Settings Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Certificate Settings</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Preview />}
                variant="outlined"
                color="secondary"
                onClick={() => window.open(import.meta.env.VITE_CERTIFICATE_DESIGNER_URL || `${import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space'}/certificate-designer`, '_blank')}
              >
                Designer Tool
              </Button>
              <Button
                startIcon={<Settings />}
                variant="outlined"
                onClick={() => setSettingsDialogOpen(true)}
              >
                Configure
              </Button>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={certificateEnabled}
                onChange={(e) => {
                  setCertificateEnabled(e.target.checked);
                  handleUpdateSettings();
                }}
              />
            }
            label="Enable Certificates for this Event"
          />

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Config Status: {' '}
                <Chip 
                  label={verificationStatus.toUpperCase()} 
                  color={
                    verificationStatus === VERIFICATION_STATUS.APPROVED ? 'success' : 
                    verificationStatus === VERIFICATION_STATUS.PENDING ? 'warning' : 
                    verificationStatus === VERIFICATION_STATUS.REJECTED ? 'error' : 'default'
                  } 
                  size="small" 
                />
              </Typography>
            </Grid>
          </Grid>
          
          {verificationStatus === VERIFICATION_STATUS.REJECTED && rejectionReason && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(244, 67, 54, 0.12)', border: '1px solid rgba(244, 67, 54, 0.35)' }}>
              <Typography variant="subtitle2" color="error" gutterBottom>
                Rejected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {rejectionReason}
              </Typography>
            </Box>
          )}

          {certificateEnabled && verificationStatus !== VERIFICATION_STATUS.APPROVED && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSubmitForVerification}
                disabled={verificationStatus === VERIFICATION_STATUS.PENDING}
                startIcon={<Refresh />}
              >
                {verificationStatus === VERIFICATION_STATUS.PENDING ? 'Pending Approval' : 'Submit for Verification'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Upload Assets Card */}
      {certificateEnabled && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Upload Assets</Typography>
              <Button
                startIcon={<CloudUpload />}
                variant="contained"
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Files
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Upload your organization logo and signatures. The CampVerse logo and templates are managed centrally.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label="Left Logo" variant="outlined" />
              <Chip label="Left Signature" variant="outlined" />
              <Chip label="Right Signature" variant="outlined" />
              <Chip label="Right Logo (fixed)" color="default" />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Certificate Status Card */}
      {certificateEnabled && certificateStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Certificate Status
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" color="primary">
                          {certificateStatus.totalAttended}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Attended
                        </Typography>
                      </Box>
                      <CircularProgress
                        variant="determinate"
                        value={100}
                        size={56}
                        thickness={4}
                        color="primary"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" color="success.main">
                          {certificateStatus.certificatesGenerated}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Certificates Generated
                        </Typography>
                      </Box>
                      <CircularProgress
                        variant="determinate"
                        value={progressStats.percentage}
                        size={56}
                        thickness={4}
                        color="success"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" color="warning.main">
                          {(certificateStatus.totalAttended || 0) - (certificateStatus.certificatesGenerated || 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pending
                        </Typography>
                      </Box>
                      <CircularProgress
                        variant="determinate"
                        value={100 - progressStats.percentage}
                        size={56}
                        thickness={4}
                        color="warning"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<FileUpload />}
                onClick={handleGenerateCertificates}
                disabled={generationProgress || verificationStatus !== VERIFICATION_STATUS.APPROVED || certificateStatus.certificatesGenerated === certificateStatus.totalAttended}
              >
                Generate Certificates
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => setRegenerateDialogOpen(true)}
                disabled={generationProgress || verificationStatus !== VERIFICATION_STATUS.APPROVED || certificateStatus.certificatesGenerated === 0}
              >
                Regenerate All
              </Button>
              {verificationStatus !== VERIFICATION_STATUS.APPROVED && (
                <Typography variant="caption" color="error">
                  Generation locked until configuration is approved by verifier.
                </Typography>
              )}
            </Box>

            {generationProgress && <LinearProgress sx={{ mb: 2 }} />}

            {/* Participants Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Attended At</TableCell>
                    <TableCell align="center">Certificate Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.userId}>
                      <TableCell>{participant.name}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>
                        {new Date(participant.attendedAt).toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        {participant.certificateGenerated ? (
                          <Chip
                            icon={<CheckCircle />}
                            label="Generated"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<Cancel />}
                            label="Pending"
                            color="warning"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {participant.certificateGenerated && (
                          <Tooltip title="Download Certificate">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => window.open(participant.certificateUrl, '_blank')}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure Certificate Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Certificate Type</InputLabel>
              <Select
                value={certificateType}
                label="Certificate Type"
                onChange={(e) => setCertificateType(e.target.value)}
              >
                <MenuItem value={CERTIFICATE_TYPES.PARTICIPATION}>Participation</MenuItem>
                <MenuItem value={CERTIFICATE_TYPES.ACHIEVEMENT}>Achievement</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Template</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate 
                      ? `Selected Template: ${selectedTemplate.name}` 
                      : "Choose a template from the admin-approved gallery."}
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => setTemplateGalleryOpen(true)} startIcon={<Preview />}>
                  Choose Template
                </Button>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Award Text"
              multiline
              rows={3}
              value={awardText}
              onChange={(e) => setAwardText(e.target.value)}
              placeholder="e.g. {name} has successfully participated in {event_name}"
              helperText="Use {name} for participant name and {event_name} for the event title."
              sx={{ mb: 1 }}
            />
            <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ mr: 1, mt: 0.5 }}>Suggestions:</Typography>
              <Chip 
                label="{name}" 
                size="small" 
                onClick={() => setAwardText(prev => prev + '{name}')} 
                sx={{ cursor: 'pointer' }}
                color="primary" variant="outlined"
              />
              <Chip 
                label="{event_name}" 
                size="small" 
                onClick={() => setAwardText(prev => prev + '{event_name}')} 
                sx={{ cursor: 'pointer' }}
                color="primary" variant="outlined"
              />
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Left Signatory
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={leftSignatory.name}
                  onChange={(e) =>
                    setLeftSignatory({ ...leftSignatory, name: e.target.value })
                  }
                  placeholder="Dr. John Doe"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title/Designation"
                  value={leftSignatory.title}
                  onChange={(e) =>
                    setLeftSignatory({ ...leftSignatory, title: e.target.value })
                  }
                  placeholder="Director"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Right Signatory
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={rightSignatory.name}
                  onChange={(e) =>
                    setRightSignatory({ ...rightSignatory, name: e.target.value })
                  }
                  placeholder="Prof. Jane Smith"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title/Designation"
                  value={rightSignatory.title}
                  onChange={(e) =>
                    setRightSignatory({ ...rightSignatory, title: e.target.value })
                  }
                  placeholder="Head of Department"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateSettings} variant="contained">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Certificate Assets</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload signatures and your organization logo. Supported formats: PNG, JPG, JPEG.
            </Typography>

            {/* Template Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Certificate Template
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setTemplateGalleryOpen(true)}
                  startIcon={<Preview />}
                >
                  Choose from Templates
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Templates are managed by admins.
                </Typography>
              </Box>
              {selectedTemplate && (
                <Chip 
                  label={`Selected: ${selectedTemplate.name}`} 
                  color="primary" 
                  onDelete={() => setSelectedTemplate(null)}
                  sx={{ mb: 1 }}
                />
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Left Logo (Your Organization - PNG recommended)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setLeftLogoFile(e.target.files[0])}
              />
              {leftLogoFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {leftLogoFile.name}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Right Logo (CampVerse) - Auto-applied
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <img src={CAMPVERSE_LOGO_URL} alt="CampVerse" style={{ height: 40 }} />
                <Typography variant="caption" color="text.secondary">
                  CampVerse logo will be automatically applied to the right side of all certificates.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Left Signature (PNG recommended)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setLeftSignatureFile(e.target.files[0])}
              />
              {leftSignatureFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {leftSignatureFile.name}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Right Signature (PNG recommended)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setRightSignatureFile(e.target.files[0])}
              />
              {rightSignatureFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {rightSignatureFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUploadAssets}
            variant="contained"
            disabled={!leftLogoFile && !leftSignatureFile && !rightSignatureFile}
          >
            Upload Assets
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Gallery Dialog */}
      <Dialog open={templateGalleryOpen} onClose={() => setTemplateGalleryOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Preview />
            Choose Certificate Template
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a pre-designed template for your certificates. The CampVerse logo will be automatically applied on the right side.
            </Typography>
            
            <Grid container spacing={3}>
              {certificateTemplates.map((template) => (
                <Grid item xs={12} sm={6} md={3} key={template.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedTemplate?.id === template.id ? '2px solid #9b5de5' : '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => {
                      setSelectedTemplate(template);
                    }}
                  >
                    <Box sx={{ 
                      height: 180, 
                      bgcolor: 'grey.200', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <img 
                        src={template.preview} 
                        alt={template.name}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain' 
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Preview Not Available</div>';
                        }}
                      />
                      {selectedTemplate?.id === template.id && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8,
                          bgcolor: '#9b5de5',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {template.name}
                      </Typography>
                      <Chip 
                        label={template.type} 
                        size="small" 
                        sx={{ mt: 1, fontSize: '0.7rem' }}
                        color={template.type === 'achievement' ? 'warning' : 'primary'}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateGalleryOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => setTemplateGalleryOpen(false)} 
            variant="contained"
            disabled={!selectedTemplate}
          >
            Use Selected Template
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={regenerateDialogOpen} onClose={() => setRegenerateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Regenerate All Certificates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will delete all existing certificates and regenerate them. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              setRegenerateDialogOpen(false);
              handleRegenerateCertificates();
            }}
          >
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

// Wrapper component to get eventId from URL params
const CertificateManagementWrapper = () => {
  const { eventId } = useParams();
  return <CertificateManagement eventId={eventId} />;
};

export default CertificateManagementWrapper;
