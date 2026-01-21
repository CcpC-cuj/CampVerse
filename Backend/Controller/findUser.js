const User = require('../Models/User');

async function findUserByEmail(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('_id name email canHost profilePhoto');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Error finding user.' });
  }
}

module.exports = { findUserByEmail };
