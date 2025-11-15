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
      console.error('Failed to fetch certificate status:', err);
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
            <Button
              startIcon={<Settings />}
              variant="outlined"
              onClick={() => setSettingsDialogOpen(true)}
            >
              Configure
            </Button>
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
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Certificate Type: <strong>{certificateType}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Status:{' '}
                {certificateEnabled ? (
                  <Chip label="Enabled" color="success" size="small" />
                ) : (
                  <Chip label="Disabled" color="default" size="small" />
                )}
              </Typography>
            </Grid>
          </Grid>
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
                      {certificateStatus.totalAttended - certificateStatus.certificatesGenerated}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<FileUpload />}
                onClick={handleGenerateCertificates}
                disabled={generationProgress || certificateStatus.certificatesGenerated === certificateStatus.totalAttended}
              >
                Generate Certificates
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRegenerateCertificates}
                disabled={generationProgress || certificateStatus.certificatesGenerated === 0}
              >
                Regenerate All
              </Button>
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

            <TextField
              fullWidth
              label="Award Text"
              multiline
              rows={3}
              value={awardText}
              onChange={(e) => setAwardText(e.target.value)}
              placeholder="For outstanding participation in..."
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

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Certificate Template (PNG/JPG)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setTemplateFile(e.target.files[0])}
              />
              {templateFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {templateFile.name}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Left Logo (PNG recommended)
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

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Right Logo (PNG recommended)
              </Typography>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setRightLogoFile(e.target.files[0])}
              />
              {rightLogoFile && (
                <Typography variant="caption" color="success.main">
                  ✓ {rightLogoFile.name}
                </Typography>
              )}
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
          <Button onClick={handleUploadAssets} variant="contained" disabled={!templateFile}>
            Upload Assets
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
