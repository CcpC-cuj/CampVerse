const User = require('../Models/User');

async function findUserByEmail(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Error finding user.' });
  }
}

module.exports = { findUserByEmail };
