import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';

const VerificationStatus = ({ eventId, certificateSettings, onSubmitForVerification, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const verificationStatus = certificateSettings?.certificateVerification?.status || 'not-submitted';
  const submittedAt = certificateSettings?.certificateVerification?.submittedAt;
  const verifiedAt = certificateSettings?.certificateVerification?.verifiedAt;
  const verifiedBy = certificateSettings?.certificateVerification?.verifiedBy;
  const rejectionReason = certificateSettings?.certificateVerification?.rejectionReason;
  const verifierComments = certificateSettings?.certificateVerification?.verifierComments;

  const getStatusInfo = () => {
    switch (verificationStatus) {
      case 'approved':
        return {
          color: 'success',
          icon: <CheckCircleIcon />,
          label: 'Approved',
          description: 'Your certificate setup has been approved. You can now generate certificates.',
        };
      case 'pending':
        return {
          color: 'warning',
          icon: <HourglassEmptyIcon />,
          label: 'Pending Review',
          description: 'Your certificate setup is under review by a verifier.',
        };
      case 'rejected':
        return {
          color: 'error',
          icon: <ErrorIcon />,
          label: 'Rejected',
          description: 'Your certificate setup needs changes. Please review the feedback below.',
        };
      default:
        return {
          color: 'default',
          icon: <InfoIcon />,
          label: 'Not Submitted',
          description: 'Submit your certificate setup for verification once you complete all steps.',
        };
    }
  };

  const statusInfo = getStatusInfo();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/certificate-verification/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ eventId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit for verification');
      }

      setConfirmDialogOpen(false);

      if (onSubmitForVerification) {
        onSubmitForVerification();
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error submitting for verification:', err);
      setError(err.message || 'Failed to submit for verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    // Check if all required assets are uploaded
    const hasTemplate = certificateSettings?.assets?.templateUrl;
    const hasOrgLogo = certificateSettings?.assets?.orgLogoUrl;
    const hasLeftSig = certificateSettings?.leftSignatory?.signatureUrl;
    const hasRightSig = certificateSettings?.rightSignatory?.signatureUrl;
    const hasAwardText = certificateSettings?.awardText;

    return hasTemplate && hasOrgLogo && hasLeftSig && hasRightSig && hasAwardText;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Verification Status
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track the verification status of your certificate setup.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            color={statusInfo.color}
            size="medium"
          />
          {verificationStatus === 'pending' && (
            <CircularProgress size={20} />
          )}
        </Box>

        <Typography variant="body1" gutterBottom>
          {statusInfo.description}
        </Typography>

        {verificationStatus === 'not-submitted' && (
          <Box mt={2}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!canSubmit() || loading}
            >
              Submit for Verification
            </Button>
            {!canSubmit() && (
              <Typography variant="caption" color="error" display="block" mt={1}>
                Please complete all certificate setup steps before submitting.
              </Typography>
            )}
          </Box>
        )}

        {verificationStatus === 'rejected' && rejectionReason && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rejection Reason:
            </Typography>
            <Typography variant="body2">{rejectionReason}</Typography>
            {verifierComments && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Verifier Comments:
                </Typography>
                <Typography variant="body2">{verifierComments}</Typography>
              </>
            )}
            <Box mt={2}>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => setConfirmDialogOpen(true)}
                disabled={!canSubmit() || loading}
              >
                Resubmit for Verification
              </Button>
            </Box>
          </Alert>
        )}

        {verificationStatus === 'approved' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Verified by: {verifiedBy?.name || 'System'}
            </Typography>
            <Typography variant="body2">
              Verified on: {new Date(verifiedAt).toLocaleString()}
            </Typography>
            {verifierComments && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Verifier Comments:
                </Typography>
                <Typography variant="body2">{verifierComments}</Typography>
              </>
            )}
          </Alert>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Timeline */}
      {(submittedAt || verifiedAt) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Verification Timeline
          </Typography>

          <Timeline position="right">
            {submittedAt && (
              <TimelineItem>
                <TimelineOppositeContent color="text.secondary">
                  {new Date(submittedAt).toLocaleString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="primary">
                    <SendIcon fontSize="small" />
                  </TimelineDot>
                  {verifiedAt && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    Submitted
                  </Typography>
                  <Typography>Certificate setup submitted for review</Typography>
                </TimelineContent>
              </TimelineItem>
            )}

            {verifiedAt && (
              <TimelineItem>
                <TimelineOppositeContent color="text.secondary">
                  {new Date(verifiedAt).toLocaleString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={verificationStatus === 'approved' ? 'success' : 'error'}>
                    {verificationStatus === 'approved' ? (
                      <CheckCircleIcon fontSize="small" />
                    ) : (
                      <ErrorIcon fontSize="small" />
                    )}
                  </TimelineDot>
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    {verificationStatus === 'approved' ? 'Approved' : 'Rejected'}
                  </Typography>
                  <Typography>
                    {verificationStatus === 'approved'
                      ? 'Certificate setup approved for generation'
                      : 'Certificate setup rejected - review feedback'}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            )}
          </Timeline>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Submit for Verification?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to submit your certificate setup for verification?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Please ensure all the following are complete:
          </Typography>
          <Box component="ul" sx={{ mt: 1 }}>
            <li>
              <Typography variant="body2">Certificate template selected</Typography>
            </li>
            <li>
              <Typography variant="body2">Organization logo uploaded</Typography>
            </li>
            <li>
              <Typography variant="body2">Both signatures uploaded with details</Typography>
            </li>
            <li>
              <Typography variant="body2">Award text configured</Typography>
            </li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerificationStatus;
