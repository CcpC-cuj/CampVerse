const express = require('express');
const router = express.Router();
const { findUserByEmail } = require('../Controller/findUser');
const { authenticateToken } = require('../Middleware/Auth');

router.get('/find-user', authenticateToken, findUserByEmail);

module.exports = router;
