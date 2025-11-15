import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';

const CertificatePreview = ({ eventId, eventTitle, certificateSettings, onSaveSettings }) => {
  const [awardText, setAwardText] = useState(
    certificateSettings?.awardText || 'For outstanding participation in'
  );
  const [certificateType, setCertificateType] = useState(
    certificateSettings?.certificateType || 'participation'
  );
  const [previewName, setPreviewName] = useState('John Doe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (certificateSettings) {
      setAwardText(certificateSettings.awardText || 'For outstanding participation in');
      setCertificateType(certificateSettings.certificateType || 'participation');
    }
  }, [certificateSettings]);

  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would call a preview endpoint that generates a sample certificate
      // For now, we'll just simulate the preview
      setPreviewUrl(
        certificateSettings?.assets?.templateUrl ||
          '/placeholder-certificate-preview.png'
      );

      setSuccess('Preview generated successfully!');
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Failed to generate preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/certificates/${eventId}/settings`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            awardText,
            certificateType,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save certificate settings');
      }

      const data = await response.json();
      setSuccess('Certificate settings saved successfully!');

      if (onSaveSettings) {
        onSaveSettings({ awardText, certificateType });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Certificate Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize the award text and preview how your certificates will look.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Certificate Configuration
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Certificate Type</InputLabel>
          <Select
            value={certificateType}
            label="Certificate Type"
            onChange={(e) => setCertificateType(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="participation">Participation</MenuItem>
            <MenuItem value="achievement">Achievement</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Award Text"
          value={awardText}
          onChange={(e) => setAwardText(e.target.value)}
          disabled={loading}
          multiline
          rows={3}
          helperText="This text will appear on all certificates. The event title will be appended automatically."
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={handleSave}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Live Preview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter a name to see how the certificate will look.
        </Typography>

        <TextField
          fullWidth
          label="Preview Name"
          value={previewName}
          onChange={(e) => setPreviewName(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleGeneratePreview}
          disabled={loading || !previewName.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <VisibilityIcon />}
          sx={{ mb: 3 }}
        >
          Generate Preview
        </Button>

        {previewUrl && (
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              bgcolor: 'grey.50',
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Preview Certificate
            </Typography>
            <Box
              component="img"
              src={previewUrl}
              alt="Certificate Preview"
              sx={{
                width: '100%',
                height: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'white',
              }}
            />
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2" gutterBottom>
                <strong>Preview Details:</strong>
              </Typography>
              <Typography variant="body2">
                Name: <strong>{previewName}</strong>
              </Typography>
              <Typography variant="body2">
                Award Text: <strong>{awardText} {eventTitle}</strong>
              </Typography>
              <Typography variant="body2">
                Type: <strong>{certificateType}</strong>
              </Typography>
              {certificateSettings?.leftSignatory && (
                <Typography variant="body2">
                  Left Signatory: <strong>{certificateSettings.leftSignatory.name}</strong> - {certificateSettings.leftSignatory.title}
                </Typography>
              )}
              {certificateSettings?.rightSignatory && (
                <Typography variant="body2">
                  Right Signatory: <strong>{certificateSettings.rightSignatory.name}</strong> - {certificateSettings.rightSignatory.title}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {!previewUrl && (
          <Alert severity="info">
            Click "Generate Preview" to see how your certificate will look with the current settings.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default CertificatePreview;
