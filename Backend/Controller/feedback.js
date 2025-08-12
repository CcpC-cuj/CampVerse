const Feedback = require('../Models/Feedback');
const { uploadProfilePhoto } = require('../Services/driveService');
const { sendFeedbackConfirmation } = require('../Services/email');

// Submit feedback (user)
async function submitFeedback(req, res) {
  try {
    const { rating, category, subject, message, email } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!rating || !category || !subject || !message || !email) {
      return res.status(400).json({
        error:
          'All fields are required: rating, category, subject, message, email',
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Handle file attachment if present
    let attachment = null;
    if (req.file) {
      try {
        const url = await uploadProfilePhoto(
          req.file.buffer,
          req.file.originalname,
          userId,
          req.file.mimetype,
        );
        attachment = {
          filename: req.file.originalname,
          url,
          mimetype: req.file.mimetype,
          size: req.file.size,
        };
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        return res.status(500).json({ error: 'Failed to upload attachment' });
      }
    }

    // Create feedback
    const feedback = new Feedback({
      userId,
      rating: parseInt(rating),
      category,
      subject: subject.trim(),
      message: message.trim(),
      email: email.trim(),
      attachment,
    });

    await feedback.save();

    // Send confirmation email to user
    try {
      const user = await require('../Models/User')
        .findById(userId)
        .select('name email');
      if (user) {
        await sendFeedbackConfirmation(user.email, user.name, {
          rating: feedback.rating,
          category: feedback.category,
          subject: feedback.subject,
          ticketId: feedback._id,
        });
      }
    } catch (emailError) {
      console.error('Failed to send feedback confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        category: feedback.category,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

// Get user's feedback history (user)
async function getMyFeedback(req, res) {
  try {
    const userId = req.user.id;
    const feedback = await Feedback.find({ userId })
      .sort({ createdAt: -1 })
      .select('-adminNotes -reviewedBy');

    res.json(feedback);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

// Get all feedback (admin/verifier only)
async function getAllFeedback(req, res) {
  try {
    if (
      !req.user.roles.includes('platformAdmin') &&
      !req.user.roles.includes('verifier')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const feedback = await Feedback.find(filter)
      .populate('userId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get all feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

// Update feedback status (admin/verifier only)
async function updateFeedbackStatus(req, res) {
  try {
    if (
      !req.user.roles.includes('platformAdmin') &&
      !req.user.roles.includes('verifier')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Update status
    if (status && status !== feedback.status) {
      feedback.status = status;
      if (status === 'reviewed' || status === 'resolved') {
        feedback.reviewedBy = req.user.id;
        feedback.reviewedAt = new Date();
      }
    }

    // Add admin notes
    if (adminNotes && adminNotes.trim()) {
      feedback.adminNotes = feedback.adminNotes || [];
      feedback.adminNotes.push({
        note: adminNotes.trim(),
        addedBy: req.user.id,
      });
    }

    await feedback.save();

    res.json({
      message: 'Feedback updated successfully',
      feedback: {
        id: feedback._id,
        status: feedback.status,
        adminNotes: feedback.adminNotes,
      },
    });
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
}

// Get feedback analytics (admin only)
async function getFeedbackAnalytics(req, res) {
  try {
    if (!req.user.roles.includes('platformAdmin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalFeedback = await Feedback.countDocuments();
    const pendingFeedback = await Feedback.countDocuments({
      status: 'pending',
    });
    const resolvedFeedback = await Feedback.countDocuments({
      status: 'resolved',
    });

    // Category distribution
    const categoryStats = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Rating distribution
    const ratingStats = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Feedback.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      totalFeedback,
      pendingFeedback,
      resolvedFeedback,
      categoryStats,
      ratingStats,
      monthlyTrend,
    });
  } catch (err) {
    console.error('Get feedback analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

module.exports = {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  getFeedbackAnalytics,
};
