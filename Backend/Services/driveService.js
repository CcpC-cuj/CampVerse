const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');

// Google Drive API configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // Create a folder in Drive and get its ID

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_DRIVE_KEY_FILE, // Path to your service account key file
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Upload image to Google Drive
const uploadImageToDrive = async (file, userId) => {
  try {
    const fileName = `profile_${userId}_${Date.now()}${path.extname(file.originalname)}`;
    
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType: file.mimetype,
      body: file.buffer,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id,
      url: `https://drive.google.com/uc?export=view&id=${response.data.id}`,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error('Failed to upload image');
  }
};

// Delete image from Google Drive
const deleteImageFromDrive = async (fileId) => {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw new Error('Failed to delete image');
  }
};

// Get image URL from Google Drive
const getImageUrl = (fileId) => {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

module.exports = {
  upload,
  uploadImageToDrive,
  deleteImageFromDrive,
  getImageUrl,
}; 