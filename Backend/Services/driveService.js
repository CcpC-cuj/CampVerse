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
const { randomUUID } = require('crypto');

// Firebase Storage integration for event images
const bucket = require('../firebase');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

/**
 * Uploads an event image (logo or banner) to Firebase Storage and returns the public URL.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {String} filename - The name of the file
 * @param {String} type - 'logo' or 'banner'
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
async function uploadEventImage(fileBuffer, filename, type) {
  const destination = `Campverse/${type}/${Date.now()}_${filename}`;
  const file = bucket.file(destination);
  const token = randomUUID();
  await file.save(fileBuffer, {
    metadata: {
      contentType: 'image/png',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  return url;
}

/**
 * Deletes an event image from Firebase Storage.
 * @param {String} fileUrl - The public URL of the file to delete
 * @returns {Promise<void>}
 */
async function deleteEventImage(fileUrl) {
  if (!fileUrl) return;
  let filePath = null;
  if (fileUrl.includes('firebasestorage.googleapis.com')) {
    const match = fileUrl.match(/\/o\/([^?]+)/);
    if (match) filePath = decodeURIComponent(match[1]);
  } else {
    const match = fileUrl.match(/\/Campverse\/.*$/);
    if (match) filePath = match[0].substring(1);
  }
  if (!filePath) return;
  await bucket.file(filePath).delete().catch(() => {});
}

/**
 * Uploads a profile photo to Firebase Storage and returns the public URL.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {String} filename - The name of the file
 * @param {String} userId - The user's ID
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
async function uploadProfilePhoto(fileBuffer, filename, userId) {
  const destination = `Campverse/profiles/${userId}_${Date.now()}_${filename}`;
  const file = bucket.file(destination);
  const token = randomUUID();
  await file.save(fileBuffer, {
    metadata: {
      contentType: 'image/png',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  return url;
}

/**
 * Deletes a profile photo from Firebase Storage.
 * @param {String} fileUrl - The public URL of the file to delete
 * @returns {Promise<void>}
 */
async function deleteProfilePhoto(fileUrl) {
  if (!fileUrl) return;
  let filePath = null;
  if (fileUrl.includes('firebasestorage.googleapis.com')) {
    const match = fileUrl.match(/\/o\/([^?]+)/);
    if (match) filePath = decodeURIComponent(match[1]);
  } else {
    const match = fileUrl.match(/\/Campverse\/profiles\/.*$/);
    if (match) filePath = match[0].substring(1);
  }
  if (!filePath) return;
  await bucket.file(filePath).delete().catch(() => {});
}

module.exports = {
  upload,
  uploadEventImage,
  deleteEventImage,
  uploadProfilePhoto,
  deleteProfilePhoto
}; 