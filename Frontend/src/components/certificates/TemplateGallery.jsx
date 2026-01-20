import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

const API_BASE = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

const TemplateGallery = ({ eventId, onTemplateSelect, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Fetch templates from main backend API instead of ML service
      // This ensures we see templates uploaded by admins
      const response = await fetch(`${API_BASE}/api/admin/certificate-templates`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      
      // Map backend fields to frontend expectations
      const mappedTemplates = (data.templates || []).map(t => ({
        ...t,
        thumbnailUrl: t.preview || t.url,
        previewUrl: t.url,
        description: t.description || `Certificate template for ${t.type} events`
      }));
      
      setTemplates(mappedTemplates);
      setError(null);
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Certificate Template
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose a template design for your event certificates. Templates are provided by CampVerse.
      </Typography>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: selectedTemplateId === template.id ? 2 : 0,
                borderColor: 'primary.main',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              {selectedTemplateId === template.id && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <CheckCircleIcon color="primary" sx={{ fontSize: 32 }} />
                </Box>
              )}

              <CardMedia
                component="img"
                height="200"
                image={template.thumbnailUrl}
                alt={template.name}
                sx={{ objectFit: 'cover', bgcolor: 'grey.200' }}
              />

              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="h6" component="div">
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.type}
                    size="small"
                    color={template.type === 'participation' ? 'primary' : 'secondary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<ZoomInIcon />}
                  onClick={() => handlePreview(template)}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant={selectedTemplateId === template.id ? 'contained' : 'outlined'}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={selectedTemplateId === template.id}
                >
                  {selectedTemplateId === template.id ? 'Selected' : 'Select'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {previewTemplate?.name}
          <Chip
            label={previewTemplate?.type}
            size="small"
            color={previewTemplate?.type === 'participation' ? 'primary' : 'secondary'}
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {previewTemplate && (
            <Box
              component="img"
              src={previewTemplate.previewUrl}
              alt={previewTemplate.name}
              sx={{
                width: '100%',
                height: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleSelectTemplate(previewTemplate);
              handleClosePreview();
            }}
          >
            Select This Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateGallery;
