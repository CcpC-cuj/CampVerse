const SupportTicket = require('../Models/SupportTicket');
const { uploadProfilePhoto } = require('../Services/driveService');
const {
  sendSupportTicketConfirmation,
  sendSupportTicketUpdate,
} = require('../Services/email');

// Submit support ticket (user)
async function submitTicket(req, res) {
  try {
    const { topic, subject, message, name, email } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!topic || !subject || !message || !name || !email) {
      return res.status(400).json({
        error: 'All fields are required: topic, subject, message, name, email',
      });
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

    // Create support ticket
    const ticket = new SupportTicket({
      userId,
      topic,
      subject: subject.trim(),
      message: message.trim(),
      name: name.trim(),
      email: email.trim(),
      attachment,
    });

    await ticket.save();

    res.status(201).json({
      message: 'Support ticket submitted successfully',
      ticket: {
        ticketId: ticket.ticketId,
        topic: ticket.topic,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err) {
    console.error('Submit ticket error:', err);
    res.status(500).json({ error: 'Failed to submit support ticket' });
  }
}

// Get user's tickets (user)
async function getMyTickets(req, res) {
  try {
    const userId = req.user.id;
    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .select('-adminNotes -assignedTo');

    res.json(tickets);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

// Get ticket by ID (user or admin)
async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name')
      .populate('adminNotes.addedBy', 'name');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Users can only see their own tickets, admins can see all
    if (
      !req.user.roles.includes('platformAdmin') &&
      !req.user.roles.includes('verifier')
    ) {
      if (ticket.userId._id.toString() !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(ticket);
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
}

// Get all tickets (admin/verifier only)
async function getAllTickets(req, res) {
  try {
    if (
      !req.user.roles.includes('platformAdmin') &&
      !req.user.roles.includes('verifier')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, topic, priority, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (topic) filter.topic = topic;
    if (priority) filter.priority = priority;

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

// Update ticket (admin/verifier only)
async function updateTicket(req, res) {
  try {
    if (
      !req.user.roles.includes('platformAdmin') &&
      !req.user.roles.includes('verifier')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { status, priority, assignedTo, adminNotes } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update fields
    if (status && status !== ticket.status) {
      ticket.status = status;
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
      } else if (status === 'closed') {
        ticket.closedAt = new Date();
      }
    }

    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;

    // Add admin notes
    if (adminNotes && adminNotes.trim()) {
      ticket.adminNotes = ticket.adminNotes || [];
      ticket.adminNotes.push({
        note: adminNotes.trim(),
        addedBy: req.user.id,
      });
    }

    await ticket.save();

    res.json({
      message: 'Ticket updated successfully',
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo,
        adminNotes: ticket.adminNotes,
      },
    });
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}

// Get support analytics (admin only)
async function getSupportAnalytics(req, res) {
  try {
    if (!req.user.roles.includes('platformAdmin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalTickets = await SupportTicket.countDocuments();
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });
    const resolvedTickets = await SupportTicket.countDocuments({
      status: 'resolved',
    });

    // Topic distribution
    const topicStats = await SupportTicket.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Priority distribution
    const priorityStats = await SupportTicket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Status distribution
    const statusStats = await SupportTicket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await SupportTicket.aggregate([
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

    // Average resolution time
    const resolvedTicketsWithTime = await SupportTicket.find({
      status: 'resolved',
      resolvedAt: { $exists: true },
    });

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolvedTicketsWithTime.forEach((ticket) => {
      if (ticket.resolvedAt && ticket.createdAt) {
        totalResolutionTime += ticket.resolvedAt - ticket.createdAt;
        resolvedCount++;
      }
    });

    const avgResolutionTime =
      resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    res.json({
      totalTickets,
      openTickets,
      resolvedTickets,
      topicStats,
      priorityStats,
      statusStats,
      monthlyTrend,
      avgResolutionTime: Math.round(avgResolutionTime / (1000 * 60 * 60 * 24)), // in days
    });
  } catch (err) {
    console.error('Get support analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

module.exports = {
  submitTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  getSupportAnalytics,
};
