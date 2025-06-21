const express = require('express');
const router = express.Router();
const {Login} = require('../Controller/User');
router.get('/login', Login);
