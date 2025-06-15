const express = require('express');
const router = express.Router();
const {Login} = require('./controller/User');
router.get('/login', Login);
