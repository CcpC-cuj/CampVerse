const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');
const axios = require('axios');
const logger = require('winston');
const { config } = require('../config/environment');

// ML API configuration
const ML_API_URL = config.ml.apiUrl;
const ML_RECOMMENDATION_ENABLED = config.ml.recommendationEnabled;
const ML_API_TIMEOUT = config.ml.timeout;

/**
 * Get personalized event recommendations for a user
 */
async function getEventRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;

    // Get user profile data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's event history
    const userHistory = await EventParticipationLog.find({ userId })
      .populate('eventId', 'title description tags type organizer date')
      .sort({ timestamp: -1 })
      .limit(20);

    // Get user's interests and skills
    const userProfile = {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      interests: user.interests || [],
      skills: user.skills || [],
      attendedEvents: userHistory
        .filter((log) => log.eventId && log.status === 'attended')
        .map((log) => ({
          eventId: log.eventId._id,
          title: log.eventId.title,
          type: log.eventId.type,
          tags: log.eventId.tags || [],
          organizer: log.eventId.organizer,
        })),
      registeredEvents: userHistory
        .filter((log) => log.eventId && log.status === 'registered')
        .map((log) => ({
          eventId: log.eventId._id,
          title: log.eventId.title,
          type: log.eventId.type,
          tags: log.eventId.tags || [],
          organizer: log.eventId.organizer,
        })),
    };

    // Get available events for recommendation
    const maxCandidates = Math.min(parseInt(limit) * 50, 500);
    const availableEvents = await Event.find({
      verificationStatus: 'approved',
      date: { $gte: new Date() },
    })
      .select('title description tags type organizer schedule hostUserId institutionId date')
      .sort({ date: 1 })
      .limit(maxCandidates);

    // Prepare data for ML API
    const recommendationData = {
      userProfile,
      availableEvents: availableEvents.map((event) => ({
        eventId: event._id,
        title: event.title,
        description: event.description,
        type: event.type,
        tags: event.tags || [],
        organizer: event.organizer,
        date: event.date,
      })),
      limit: parseInt(limit),
      page: parseInt(page),
    };

    // Call ML API for recommendations
    try {
      // Check if ML recommendations are enabled
      if (!ML_RECOMMENDATION_ENABLED) {
        logger.info('ML recommendations disabled, using fallback');
        const fallbackRecommendations = await getFallbackRecommendations(
          userProfile,
          availableEvents,
          limit,
        );

        return res.json({
          recommendations: fallbackRecommendations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: fallbackRecommendations.length,
          },
          userProfile: {
            interests: userProfile.interests,
            skills: userProfile.skills,
            attendedCount: userProfile.attendedEvents.length,
            registeredCount: userProfile.registeredEvents.length,
          },
          note: 'Using fallback recommendations (ML feature disabled)',
        });
      }

      const mlResponse = await axios.post(
        `${ML_API_URL}/recommend`,
        recommendationData,
        {
          timeout: ML_API_TIMEOUT,
        },
      );

      const recommendations = mlResponse.data.recommendations || [];

      // Get full event details for recommended events
      const recommendedEventIds = recommendations.map((rec) => rec.eventId);
      const recommendedEvents = await Event.find({
        _id: { $in: recommendedEventIds },
      }).populate('hostUserId', 'name email');

      // Map recommendations with full event details
      const finalRecommendations = recommendations
        .map((rec) => {
          if (!rec.eventId) return null;
          const eventIdStr = rec.eventId.toString();
          const event = recommendedEvents.find(
            (e) => e && e._id && e._id.toString() === eventIdStr,
          );
          return {
            eventId: rec.eventId,
            similarityScore: rec.similarityScore,
            reason: rec.reason,
            event: event
              ? {
                _id: event._id,
                title: event.title,
                description: event.description,
                tags: event.tags,
                type: event.type,
                organizer: event.organizer,
                schedule: event.schedule,
                host: event.hostUserId,
                verificationStatus: event.verificationStatus,
                isPaid: event.isPaid,
                price: event.price,
              }
              : null,
          };
        })
        .filter((rec) => rec.event !== null);

      return res.json({
        recommendations: finalRecommendations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: finalRecommendations.length,
        },
        userProfile: {
          interests: userProfile.interests,
          skills: userProfile.skills,
          attendedCount: userProfile.attendedEvents.length,
          registeredCount: userProfile.registeredEvents.length,
        },
      });
    } catch (mlError) {
      logger.error('ML API error:', mlError);

      // Fallback: return events based on user interests
      const fallbackRecommendations = await getFallbackRecommendations(
        userProfile,
        availableEvents,
        limit,
      );

      return res.json({
        recommendations: fallbackRecommendations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: fallbackRecommendations.length,
        },
        userProfile: {
          interests: userProfile.interests,
          skills: userProfile.skills,
          attendedCount: userProfile.attendedEvents.length,
          registeredCount: userProfile.registeredEvents.length,
        },
        note: 'Using fallback recommendations (ML API unavailable)',
      });
    }
  } catch (error) {
    logger.error('Event recommendation error:', error);
    return res
      .status(500)
      .json({ error: 'Error getting event recommendations' });
  }
}

/**
 * Fallback recommendation system based on user interests
 */
async function getFallbackRecommendations(userProfile, availableEvents, limit) {
  const userInterests = userProfile.interests.map((interest) =>
    interest.toLowerCase(),
  );
  const userSkills = userProfile.skills.map((skill) => skill.toLowerCase());

  // Score events based on user interests and skills
  const scoredEvents = availableEvents.map((event) => {
    let score = 0;
    const eventTags = (event.tags || []).map((tag) => tag.toLowerCase());
    const eventType = (event.type || '').toLowerCase();
    const eventDescription = (event.description || '').toLowerCase();

    // Score based on interests
    userInterests.forEach((interest) => {
      if (eventTags.includes(interest)) score += 3;
      if (eventType.includes(interest)) score += 2;
      if (eventDescription.includes(interest)) score += 1;
    });

    // Score based on skills
    userSkills.forEach((skill) => {
      if (eventTags.includes(skill)) score += 2;
      if (eventType.includes(skill)) score += 1;
    });

    // Bonus for events from same organizer as attended events
    const attendedOrganizers = userProfile.attendedEvents.map(
      (e) => e.organizer,
    );
    if (attendedOrganizers.includes(event.organizer)) score += 1;

    return {
      eventId: event._id,
      similarityScore: score,
      reason:
        score > 0 ? 'Based on your interests and skills' : 'Popular events',
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        tags: event.tags,
        type: event.type,
        organizer: event.organizer,
        schedule: event.schedule,
      },
    };
  });

  // Sort by score and return top recommendations
  return scoredEvents
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, parseInt(limit));
}

/**
 * Get similar events based on a specific event
 */
async function getSimilarEvents(req, res) {
  try {
    const { eventId } = req.params;
    const { limit = 5 } = req.query;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Find events with similar tags, type, or organizer
    const similarEvents = await Event.find({
      _id: { $ne: eventId },
      verificationStatus: 'approved',
      date: { $gte: new Date() },
      $or: [
        { tags: { $in: event.tags || [] } },
        { type: event.type },
        { organizer: event.organizer },
      ],
    })
      .populate('hostUserId', 'name email')
      .limit(parseInt(limit))
      .sort({ date: 1 });

    const recommendations = similarEvents.map((similarEvent) => ({
      eventId: similarEvent._id,
      similarityScore: calculateSimilarityScore(event, similarEvent),
      reason: getSimilarityReason(event, similarEvent),
      event: {
        _id: similarEvent._id,
        title: similarEvent.title,
        description: similarEvent.description,
        tags: similarEvent.tags,
        type: similarEvent.type,
        organizer: similarEvent.organizer,
        date: similarEvent.date,
        host: similarEvent.hostUserId,
        verificationStatus: similarEvent.verificationStatus,
        isPaid: similarEvent.isPaid,
        price: similarEvent.price,
      },
    }));

    return res.json({
      baseEvent: {
        _id: event._id,
        title: event.title,
        description: event.description,
        tags: event.tags,
        type: event.type,
        organizer: event.organizer,
      },
      similarEvents: recommendations,
    });
  } catch (error) {
    logger.error('Similar events error:', error);
    return res.status(500).json({ error: 'Error getting similar events' });
  }
}

/**
 * Calculate similarity score between two events
 */
function calculateSimilarityScore(event1, event2) {
  let score = 0;

  // Tag similarity
  const tags1 = new Set(event1.tags || []);
  const tags2 = new Set(event2.tags || []);
  const tagIntersection = new Set([...tags1].filter((x) => tags2.has(x)));
  score += tagIntersection.size * 2;

  // Type similarity
  if (event1.type === event2.type) score += 3;

  // Organizer similarity
  if (event1.organizer === event2.organizer) score += 2;

  return score;
}

/**
 * Get reason for similarity
 */
function getSimilarityReason(event1, event2) {
  const reasons = [];

  if (event1.type === event2.type) {
    reasons.push('Same event type');
  }

  const tags1 = new Set(event1.tags || []);
  const tags2 = new Set(event2.tags || []);
  const commonTags = [...tags1].filter((x) => tags2.has(x));

  if (commonTags.length > 0) {
    reasons.push(`Similar tags: ${commonTags.join(', ')}`);
  }

  if (event1.organizer === event2.organizer) {
    reasons.push('Same organizer');
  }

  return reasons.join(', ');
}

/**
 * Update user preferences based on event interaction
 */
async function updateUserPreferences(req, res) {
  try {
    const userId = req.user.id;
    const { eventId, action } = req.body; // action: 'view', 'like', 'attend', 'register'

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update user preferences based on action
    const updatedInterests = [...(user.interests || [])];
    const updatedSkills = [...(user.skills || [])];

    if (action === 'like' || action === 'attend') {
      // Add event tags to interests if not already present
      (event.tags || []).forEach((tag) => {
        if (!updatedInterests.includes(tag)) {
          updatedInterests.push(tag);
        }
      });

      // Add event type to interests if not already present
      if (event.type && !updatedInterests.includes(event.type)) {
        updatedInterests.push(event.type);
      }
    }

    // Update user profile
    await User.findByIdAndUpdate(userId, {
      interests: updatedInterests,
      skills: updatedSkills,
    });

    return res.json({
      message: 'User preferences updated successfully',
      updatedInterests,
      updatedSkills,
    });
  } catch (error) {
    logger.error('Update user preferences error:', error);
    return res.status(500).json({ error: 'Error updating user preferences' });
  }
}

module.exports = {
  getEventRecommendations,
  getSimilarEvents,
  updateUserPreferences,
};
