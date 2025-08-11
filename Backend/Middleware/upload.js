const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

// Enforce 5MB max and allow only common image types
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype.toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files (jpg, jpeg, png, gif) up to 5MB are allowed.'));
  }
});

module.exports = upload;