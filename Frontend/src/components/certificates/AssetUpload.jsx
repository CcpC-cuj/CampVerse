import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AssetUpload = ({ eventId, onUploadComplete, existingAssets }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [orgLogo, setOrgLogo] = useState(existingAssets?.orgLogo || null);
  const [leftSignature, setLeftSignature] = useState(existingAssets?.leftSignature || null);
  const [rightSignature, setRightSignature] = useState(existingAssets?.rightSignature || null);

  const [leftSignatoryName, setLeftSignatoryName] = useState(existingAssets?.leftSignatoryName || '');
  const [leftSignatoryTitle, setLeftSignatoryTitle] = useState(existingAssets?.leftSignatoryTitle || '');
  const [rightSignatoryName, setRightSignatoryName] = useState(existingAssets?.rightSignatoryName || '');
  const [rightSignatoryTitle, setRightSignatoryTitle] = useState(existingAssets?.rightSignatoryTitle || '');

  const handleFileSelect = async (assetType, file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type for ${assetType}. Please upload PNG, JPG, or WEBP.`);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(`File too large for ${assetType}. Maximum size is 5MB.`);
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);

    // Update state based on asset type
    switch (assetType) {
      case 'orgLogo':
        setOrgLogo({ file, preview });
        break;
      case 'leftSignature':
        setLeftSignature({ file, preview });
        break;
      case 'rightSignature':
        setRightSignature({ file, preview });
        break;
      default:
        break;
    }

    setError(null);
  };

  const handleRemoveAsset = (assetType) => {
    switch (assetType) {
      case 'orgLogo':
        if (orgLogo?.preview) URL.revokeObjectURL(orgLogo.preview);
        setOrgLogo(null);
        break;
      case 'leftSignature':
        if (leftSignature?.preview) URL.revokeObjectURL(leftSignature.preview);
        setLeftSignature(null);
        break;
      case 'rightSignature':
        if (rightSignature?.preview) URL.revokeObjectURL(rightSignature.preview);
        setRightSignature(null);
        break;
      default:
        break;
    }
  };

  const handleUploadAll = async () => {
    // Validate all required assets
    if (!orgLogo || !leftSignature || !rightSignature) {
      setError('Please upload all required assets: Organization Logo, Left Signature, and Right Signature.');
      return;
    }

    if (!leftSignatoryName || !leftSignatoryTitle || !rightSignatoryName || !rightSignatoryTitle) {
      setError('Please fill in all signatory names and titles.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('authToken');
      const uploadResults = {};

      // Upload organization logo
      const orgLogoFormData = new FormData();
      orgLogoFormData.append('files', orgLogo.file);
      orgLogoFormData.append('assetType', 'orgLogo');

      const orgLogoResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/certificates/${eventId}/upload-assets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: orgLogoFormData,
        }
      );

      if (!orgLogoResponse.ok) {
        throw new Error('Failed to upload organization logo');
      }

      const orgLogoData = await orgLogoResponse.json();
      uploadResults.orgLogo = orgLogoData;

      // Upload left signature
      const leftSigFormData = new FormData();
      leftSigFormData.append('files', leftSignature.file);
      leftSigFormData.append('assetType', 'leftSignature');
      leftSigFormData.append('leftSignatoryName', leftSignatoryName);
      leftSigFormData.append('leftSignatoryTitle', leftSignatoryTitle);

      const leftSigResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/certificates/${eventId}/upload-assets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: leftSigFormData,
        }
      );

      if (!leftSigResponse.ok) {
        throw new Error('Failed to upload left signature');
      }

      const leftSigData = await leftSigResponse.json();
      uploadResults.leftSignature = leftSigData;

      // Upload right signature
      const rightSigFormData = new FormData();
      rightSigFormData.append('files', rightSignature.file);
      rightSigFormData.append('assetType', 'rightSignature');
      rightSigFormData.append('rightSignatoryName', rightSignatoryName);
      rightSigFormData.append('rightSignatoryTitle', rightSignatoryTitle);

      const rightSigResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/certificates/${eventId}/upload-assets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: rightSigFormData,
        }
      );

      if (!rightSigResponse.ok) {
        throw new Error('Failed to upload right signature');
      }

      const rightSigData = await rightSigResponse.json();
      uploadResults.rightSignature = rightSigData;

      setSuccess('All assets uploaded successfully to cloud storage!');

      if (onUploadComplete) {
        onUploadComplete(uploadResults);
      }
    } catch (err) {
      console.error('Error uploading assets:', err);
      setError(err.message || 'Failed to upload assets. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const AssetCard = ({ title, description, assetType, asset, required = true }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            {title}
            {required && <span style={{ color: 'red' }}>*</span>}
          </Typography>
          {asset && <CheckCircleIcon color="success" />}
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>

        {asset ? (
          <Box mt={2}>
            <CardMedia
              component="img"
              height="150"
              image={asset.preview || asset.url}
              alt={title}
              sx={{ objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 1 }}
            />
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="caption" color="text.secondary">
                {asset.file?.name || 'Uploaded'}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveAsset(assetType)}
                disabled={uploading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2 }}
            disabled={uploading}
          >
            Upload {title}
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(assetType, file);
              }}
            />
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload Certificate Assets
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your organization's logo and both signatures. All images will be stored securely in cloud storage.
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

      <Grid container spacing={3}>
        {/* Organization Logo */}
        <Grid item xs={12} md={4}>
          <AssetCard
            title="Organization Logo"
            description="Your organization or institution logo (PNG, JPG, max 5MB)"
            assetType="orgLogo"
            asset={orgLogo}
          />
        </Grid>

        {/* Left Signature */}
        <Grid item xs={12} md={4}>
          <AssetCard
            title="Left Signature"
            description="First signatory's signature image (PNG, JPG, max 5MB)"
            assetType="leftSignature"
            asset={leftSignature}
          />
          {leftSignature && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Signatory Name"
                value={leftSignatoryName}
                onChange={(e) => setLeftSignatoryName(e.target.value)}
                disabled={uploading}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Signatory Title"
                value={leftSignatoryTitle}
                onChange={(e) => setLeftSignatoryTitle(e.target.value)}
                disabled={uploading}
                required
              />
            </Paper>
          )}
        </Grid>

        {/* Right Signature */}
        <Grid item xs={12} md={4}>
          <AssetCard
            title="Right Signature"
            description="Second signatory's signature image (PNG, JPG, max 5MB)"
            assetType="rightSignature"
            asset={rightSignature}
          />
          {rightSignature && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Signatory Name"
                value={rightSignatoryName}
                onChange={(e) => setRightSignatoryName(e.target.value)}
                disabled={uploading}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Signatory Title"
                value={rightSignatoryTitle}
                onChange={(e) => setRightSignatoryTitle(e.target.value)}
                disabled={uploading}
                required
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          onClick={handleUploadAll}
          disabled={
            uploading ||
            !orgLogo ||
            !leftSignature ||
            !rightSignature ||
            !leftSignatoryName ||
            !leftSignatoryTitle ||
            !rightSignatoryName ||
            !rightSignatoryTitle
          }
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        >
          {uploading ? 'Uploading to Cloud...' : 'Upload All Assets'}
        </Button>
      </Box>
    </Box>
  );
};

export default AssetUpload;
