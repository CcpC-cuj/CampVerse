/*
 * Google Drive Folder Structure (Planned/Current):
 *
 * 1. Event Images:
 *    - Logos are uploaded to the folder with ID process.env.DRIVE_LOGO_FOLDER_ID
 *    - Banners are uploaded to the folder with ID process.env.DRIVE_BANNER_FOLDER_ID
 *    - This ensures separation of logo and banner images for all events.
 *
 * 2. Certificates (Planned):
 *    - For each event, a new folder will be created in Drive, named after the event (e.g., "EventName_Certificates").
 *    - All certificates generated for that event (by ML API) will be stored in this folder.
 *    - Each certificate file will be linked to the corresponding user in the database, so users can access/download their certificates.
 *    - (Future) Optionally, users may be able to browse/download their certificates directly from the event-named folder in Drive.
 *
 * 3. ML Integration:
 *    - Certificate generation and event recommendations will be handled by external ML APIs.
 *    - Backend endpoints will call these ML APIs and store results (certificates, recommendations) as needed.
 *
 * These plans are for reference/documentation and do not affect current code execution.
 */
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
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

/**
 * Uploads an event image (logo or banner) to Google Drive and returns the file URL.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {String} filename - The name of the file
 * @param {String} type - 'logo' or 'banner'
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
async function uploadEventImage(fileBuffer, filename, type) {
  const folderId = type === 'logo'
    ? process.env.DRIVE_LOGO_FOLDER_ID
    : process.env.DRIVE_BANNER_FOLDER_ID;
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const { data } = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: 'image/png', // or detect from file
    },
    media: {
      mimeType: 'image/png',
      body: bufferStream,
    },
    fields: 'id',
  });

  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return `https://drive.google.com/uc?export=view&id=${data.id}`;
}

module.exports = {
  upload,
  uploadImageToDrive,
  deleteImageFromDrive,
  getImageUrl,
  uploadEventImage
}; 