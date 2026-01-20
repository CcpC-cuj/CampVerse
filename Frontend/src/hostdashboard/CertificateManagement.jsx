import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
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
const CERTIFICATE_TEMPLATES = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    preview: '/templates/classic-blue-preview.png',
    url: 'https://storage.campverse.com/templates/classic-blue.png',
    type: 'participation'
  },
  {
    id: 'modern-purple',
    name: 'Modern Purple',
    preview: '/templates/modern-purple-preview.png',
    url: 'https://storage.campverse.com/templates/modern-purple.png',
    type: 'participation'
  },
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    preview: '/templates/elegant-gold-preview.png',
    url: 'https://storage.campverse.com/templates/elegant-gold.png',
    type: 'achievement'
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    preview: '/templates/minimal-dark-preview.png',
    url: 'https://storage.campverse.com/templates/minimal-dark.png',
    type: 'participation'
  }
];

// CampVerse logo URL (always used on right side)
const CAMPVERSE_LOGO_URL = '/logo.png';

const CertificateManagement = ({ eventId }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Certificate settings
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [certificateType, setCertificateType] = useState('participation');
  const [awardText, setAwardText] = useState('');
  const [leftSignatory, setLeftSignatory] = useState({ name: '', title: '' });
  const [rightSignatory, setRightSignatory] = useState({ name: '', title: '' });
  
  // Verification Status
  const [verificationStatus, setVerificationStatus] = useState('not_configured');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Selected Template (Assigned by Admin)
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Upload states
  const [templateFile, setTemplateFile] = useState(null);
  const [leftLogoFile, setLeftLogoFile] = useState(null);
  const [rightLogoFile, setRightLogoFile] = useState(null);
  const [leftSignatureFile, setLeftSignatureFile] = useState(null);
  const [rightSignatureFile, setRightSignatureFile] = useState(null);
  
  // Status
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [generationProgress, setGenerationProgress] = useState(false);
  
  // Dialogs
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    fetchCertificateStatus();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const eventData = response.data;
      setEvent(eventData);
      setCertificateEnabled(eventData.features?.certificateEnabled || false);
      
      if (eventData.certificateSettings) {
        setCertificateType(eventData.certificateSettings.certificateType || 'participation');
        setAwardText(eventData.certificateSettings.awardText || '');
        setLeftSignatory(eventData.certificateSettings.leftSignatory || { name: '', title: '' });
        setRightSignatory(eventData.certificateSettings.rightSignatory || { name: '', title: '' });
        setVerificationStatus(eventData.certificateSettings.verificationStatus || 'not_configured');
        setRejectionReason(eventData.certificateSettings.rejectionReason || '');
        
        // Find selected template from gallery if ID exists
        if (eventData.certificateSettings.selectedTemplateId) {
          const template = CERTIFICATE_TEMPLATES.find(t => t.id === eventData.certificateSettings.selectedTemplateId);
          setSelectedTemplate(template);
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load event details');
      setLoading(false);
    }
  };

  const fetchCertificateStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCertificateStatus(response.data);
      setParticipants(response.data.participants || []);
    } catch (err) {
      // Failed to fetch certificate status - silently ignore
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/settings`,
        {
          certificateEnabled,
          certificateType,
          awardText,
          leftSignatory,
          rightSignatory,
          selectedTemplateId: selectedTemplate?.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Certificate settings updated successfully!');
      setSettingsDialogOpen(false);
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const handleSubmitForVerification = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Submitted for verification!');
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit for verification');
    }
  };

  const handleUploadAssets = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      
      // Upload template
      if (templateFile) {
        const formData = new FormData();
        formData.append('files', templateFile);
        formData.append('assetType', 'template');
        formData.append('template_type', certificateType);
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      // Upload logos
      if (leftLogoFile) {
        const formData = new FormData();
        formData.append('files', leftLogoFile);
        formData.append('assetType', 'logo');
        formData.append('logo_type', 'left');
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      if (rightLogoFile) {
        const formData = new FormData();
        formData.append('files', rightLogoFile);
        formData.append('assetType', 'logo');
        formData.append('logo_type', 'right');
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/upload-assets`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      setSuccess('Assets uploaded successfully!');
      setUploadDialogOpen(false);
      
      // Reset file states
      setTemplateFile(null);
      setLeftLogoFile(null);
      setRightLogoFile(null);
      setLeftSignatureFile(null);
      setRightSignatureFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload assets');
    }
  };

  const handleGenerateCertificates = async () => {
    try {
      setError('');
      setSuccess('');
      setGenerationProgress(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/generate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess(`Successfully generated ${response.data.totalGenerated} certificate(s)!`);
      setGenerationProgress(false);
      fetchCertificateStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate certificates');
      setGenerationProgress(false);
    }
  };

  const handleRegenerateCertificates = async () => {
    if (!confirm('This will delete all existing certificates and regenerate them. Continue?')) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      setGenerationProgress(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/certificate-management/events/${eventId}/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Certificates regenerated successfully!');
      setGenerationProgress(false);
      fetchCertificateStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate certificates');
      setGenerationProgress(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Certificate Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

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
                onClick={() => window.open(import.meta.env.VITE_CERTIFICATE_DESIGNER_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/certificate-designer`, '_blank')}
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
                    verificationStatus === 'approved' ? 'success' : 
                    verificationStatus === 'pending' ? 'warning' : 
                    verificationStatus === 'rejected' ? 'error' : 'default'
                  } 
                  size="small" 
                />
              </Typography>
            </Grid>
          </Grid>
          
          {verificationStatus === 'rejected' && rejectionReason && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>Rejected:</strong> {rejectionReason}
            </Alert>
          )}

          {certificateEnabled && verificationStatus !== 'approved' && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSubmitForVerification}
                disabled={verificationStatus === 'pending'}
                startIcon={<Refresh />}
              >
                {verificationStatus === 'pending' ? 'Pending Approval' : 'Submit for Verification'}
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
              Upload certificate template, logos, and signature images to customize your certificates.
            </Typography>
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
                    <Typography variant="h4" color="primary">
                      {certificateStatus.totalAttended}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Attended
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {certificateStatus.certificatesGenerated}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Certificates Generated
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="warning.main">
                      {(certificateStatus.totalAttended || 0) - (certificateStatus.certificatesGenerated || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<FileUpload />}
                onClick={handleGenerateCertificates}
                disabled={generationProgress || verificationStatus !== 'approved' || certificateStatus.certificatesGenerated === certificateStatus.totalAttended}
              >
                Generate Certificates
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRegenerateCertificates}
                disabled={generationProgress || verificationStatus !== 'approved' || certificateStatus.certificatesGenerated === 0}
              >
                Regenerate All
              </Button>
              {verificationStatus !== 'approved' && (
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
                <MenuItem value="participation">Participation</MenuItem>
                <MenuItem value="achievement">Achievement</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Template</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTemplate 
                  ? `Assigned Template: ${selectedTemplate.name}` 
                  : "Template will be assigned by a verifier/admin after submission."}
              </Typography>
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
              sx={{ mb: 3 }}
            />

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
              Upload all required files for certificate generation. Supported formats: PNG, JPG, JPEG
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
                <Typography variant="body2" color="text.secondary">or</Typography>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    setTemplateFile(e.target.files[0]);
                    setSelectedTemplate(null);
                  }}
                />
              </Box>
              {selectedTemplate && (
                <Chip 
                  label={`Selected: ${selectedTemplate.name}`} 
                  color="primary" 
                  onDelete={() => setSelectedTemplate(null)}
                  sx={{ mb: 1 }}
                />
              )}
              {templateFile && !selectedTemplate && (
                <Typography variant="caption" color="success.main">
                  ✓ Custom: {templateFile.name}
                </Typography>
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
          <Button onClick={handleUploadAssets} variant="contained" disabled={!templateFile && !selectedTemplate}>
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
              {CERTIFICATE_TEMPLATES.map((template) => (
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
                      setTemplateFile(null);
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
    </Box>
  );
};

// Wrapper component to get eventId from URL params
const CertificateManagementWrapper = () => {
  const { eventId } = useParams();
  return <CertificateManagement eventId={eventId} />;
};

export default CertificateManagementWrapper;
