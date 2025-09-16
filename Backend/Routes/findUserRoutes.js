const express = require('express');
const router = express.Router();
const { findUserByEmail } = require('../Controller/findUser');
const { protect } = require('../Middleware/Auth');

router.get('/find-user', protect, findUserByEmail);

module.exports = router;
