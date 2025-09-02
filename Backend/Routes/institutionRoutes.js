const express = require('express');
const {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  deleteInstitution,
  approveInstitutionVerification,
  rejectInstitutionVerification,
  getPendingInstitutionVerifications,
  getInstitutionAnalytics,
  getInstitutionDashboard,
  requestPublicDashboard,
  approvePublicDashboard,
  searchInstitutions,
  requestNewInstitution,
} = require('../Controller/institution');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/institutions:
 *   post:
 *     summary: Create a new institution (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, location, emailDomain]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [college, university, org, temporary] }
 *               location: { type: object, properties: { city: { type: string }, state: { type: string }, country: { type: string } } }
 *               emailDomain: { type: string }
 *     responses:
 *       201: { description: Institution created }
 *       403: { description: Forbidden }
 */
router.post(
  '/',
  authenticateToken,
  requireRole('platformAdmin'),
  createInstitution,
);

// New: search institutions by name/domain
/**
 * @swagger
 * /api/institutions/search:
 *   get:
 *     summary: Search institutions by name or email domain
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: List of institutions }
 */
router.get('/search', authenticateToken, searchInstitutions);

// New: request creation of a new institution (user)
/**
 * @swagger
 * /api/institutions/request-new:
 *   post:
 *     summary: Request a new institution (user)
 *     description: |
 *       **Frontend Implementation Guide:**
 *
 *       This endpoint allows users to request the creation of a new institution.
 *       The institution will be created as unverified and only platform administrators
 *       can approve it and add location/contact details.
 *
 *       **Frontend Form Fields:**
 *       - `name` (required): Institution name (e.g., "MIT University")
 *       - `type` (required): Institution type - must be one of: "college", "university", "org", "temporary"
 *
 *       **Optional Fields (if your form has them):**
 *       - `website`: Institution website URL
 *       - `phone`: Institution phone number
 *       - `info`: Additional information about the institution
 *
 *       **Note:** Location fields (city, state, country) are NOT collected from users.
 *       They will be added by administrators during the approval process.
 *
 *       **User Experience Flow:**
 *       1. User fills out institution request form
 *       2. Form submits to this endpoint
 *       3. Institution is created as "unverified"
 *       4. User's status becomes "pending"
 *       5. Platform admins are notified
 *       6. Admin reviews and approves with location details
 *       7. User status automatically becomes "verified"
 *
 *       **Frontend Form Example:**
 *       ```html
 *       <form onSubmit={handleSubmit}>
 *         <input
 *           name="name"
 *           placeholder="Institution Name"
 *           required
 *         />
 *         <select name="type" required>
 *           <option value="">Select Type</option>
 *           <option value="college">College</option>
 *           <option value="university">University</option>
 *           <option value="org">Organization</option>
 *           <option value="temporary">Temporary</option>
 *         </select>
 *         <input
 *           name="website"
 *           placeholder="Website (optional)"
 *         />
 *         <input
 *           name="phone"
 *           placeholder="Phone (optional)"
 *         />
 *         <textarea
 *           name="info"
 *           placeholder="Additional Info (optional)"
 *         />
 *         <button type="submit">Submit Request</button>
 *       </form>
 *       ```
 *
 *       **React Hook Example:**
 *       ```javascript
 *       const [formData, setFormData] = useState({
 *         name: '',
 *         type: '',
 *         website: '',
 *         phone: '',
 *         info: ''
 *       });
 *
 *       const handleSubmit = async (e) => {
 *         e.preventDefault();
 *         try {
 *           const response = await fetch('/api/institutions/request-new', {
 *             method: 'POST',
 *             headers: {
 *               'Content-Type': 'application/json',
 *               'Authorization': `Bearer ${token}`
 *             },
 *             body: JSON.stringify(formData)
 *           });
 *
 *           if (response.ok) {
 *             const result = await response.json();
 *             // Show success message
 *             alert('Institution request submitted! It will be reviewed by administrators.');
 *           } else {
 *             const error = await response.json();
 *             alert(`Error: ${error.error}`);
 *           }
 *         } catch (error) {
 *           console.error('Error:', error);
 *         }
 *       };
 *       ```
 *
 *       **Status Tracking:**
 *       After submission, check user's `institutionVerificationStatus`:
 *       - `"pending"`: Request submitted, waiting for admin review
 *       - `"verified"`: Institution approved by admin
 *       - `"rejected"`: Institution rejected by admin
 *
 *       **Error Handling:**
 *       - 400: Missing required fields or invalid type
 *       - 409: Institution with same email domain already exists
 *       - 500: Server error
 *
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string, description: 'Institution name (required)' }
 *               type: { type: string, enum: ['college', 'university', 'org', 'temporary'], description: 'Institution type (required)' }
 *               website: { type: string, description: 'Institution website (optional)' }
 *               phone: { type: string, description: 'Institution phone number (optional)' }
 *               info: { type: string, description: 'Additional information (optional)' }
 *           examples:
 *             minimal:
 *               summary: Minimal request (only required fields)
 *               value:
 *                 name: "MIT University"
 *                 type: "university"
 *             complete:
 *               summary: Complete request with optional fields
 *               value:
 *                 name: "MIT University"
 *                 type: "university"
 *                 website: "https://mit.edu"
 *                 phone: "617-253-1000"
 *                 info: "Massachusetts Institute of Technology"
 *     responses:
 *       201:
 *         description: Institution request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Institution request submitted successfully. It will be reviewed by administrators." }
 *                 institution:
 *                   type: object
 *                   properties:
 *                     id: { type: string, description: "Institution ID" }
 *                     name: { type: string, description: "Institution name" }
 *                     type: { type: string, description: "Institution type" }
 *                     emailDomain: { type: string, description: "Email domain derived from user's email" }
 *                     isVerified: { type: boolean, example: false }
 *                     verificationRequested: { type: boolean, example: true }
 *                     createdAt: { type: string, format: date-time }
 *                 note: { type: string, example: "This institution is currently unverified. Only platform administrators can verify it." }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "name and type are required." }
 *                 received: { type: object, description: "What was actually received" }
 *       409:
 *         description: Institution with domain already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "An institution with this email domain already exists." }
 *                 existingInstitution: { type: object, description: "Details of existing institution" }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Error submitting institution request." }
 *                 details: { type: string, description: "Error details (only in development)" }
 */
router.post('/request-new', authenticateToken, requestNewInstitution);

// New: Get pending institution verifications (verifier or admin)
/**
 * @swagger
 * /api/institutions/pending-verifications:
 *   get:
 *     summary: Get pending institution verifications (verifier or admin)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: 
 *         description: List of pending institution verifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pendingInstitutions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       type: { type: string }
 *                       emailDomain: { type: string }
 *                       website: { type: string }
 *                       phone: { type: string }
 *                       info: { type: string }
 *                       latestRequest:
 *                         type: object
 *                         properties:
 *                           requestedBy: { type: object }
 *                           institutionName: { type: string }
 *                           website: { type: string }
 *                           phone: { type: string }
 *                           info: { type: string }
 *                           createdAt: { type: string }
 *                           status: { type: string }
 *                 count: { type: number }
 *       403: { description: Forbidden - only verifiers or admins can access }
 */
router.get('/pending-verifications', authenticateToken, requireRole(['verifier', 'platformAdmin']), getPendingInstitutionVerifications);

/**
 * @swagger
 * /api/institutions:
 *   get:
 *     summary: Get all institutions (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of institutions }
 *       403: { description: Forbidden }
 */
router.get(
  '/',
  authenticateToken,
  requireRole('platformAdmin'),
  getInstitutions,
);

/**
 * @swagger
 * /api/institutions/{id}:
 *   get:
 *     summary: Get institution by ID (admin or self)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution details }
 *       403: { description: Forbidden }
 */
router.get('/:id', authenticateToken, getInstitutionById);

/**
 * @swagger
 * /api/institutions/{id}:
 *   patch:
 *     summary: Update institution (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Institution updated }
 *       403: { description: Forbidden }
 */
router.patch(
  '/:id',
  authenticateToken,
  requireRole('platformAdmin'),
  updateInstitution,
);

/**
 * @swagger
 * /api/institutions/{id}:
 *   delete:
 *     summary: Delete institution (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution deleted }
 *       403: { description: Forbidden }
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole('platformAdmin'),
  deleteInstitution,
);

// REMOVED: Redundant verification request endpoint
// Users are auto-linked by domain, no need for separate verification requests

/**
 * @swagger
 * /api/institutions/{id}/approve-verification:
 *   post:
 *     summary: Approve institution verification (admin only)
 *     description: |
 *       **Admin Panel Implementation Guide:**
 *
 *       This endpoint allows platform administrators to approve institution verification
 *       requests and optionally add location, website, phone, and additional information.
 *
 *       **Admin Workflow:**
 *       1. Admin receives notification about new institution request
 *       2. Admin reviews the request details
 *       3. Admin can approve with or without additional details
 *       4. If approved, all users with this institution get verified status
 *
 *       **Admin Form Fields (all optional):**
 *       - `location.city`: City name (e.g., "Cambridge")
 *       - `location.state`: State/Province (e.g., "Massachusetts")
 *       - `location.country`: Country name (e.g., "USA")
 *       - `website`: Institution website URL
 *       - `phone`: Institution phone number
 *       - `info`: Additional information about the institution
 *
 *       **Admin Panel Form Example:**
 *       ```html
 *       <form onSubmit={handleApproval}>
 *         <h3>Approve Institution: {institution.name}</h3>
 *
 *         <div>
 *           <label>Location (optional):</label>
 *           <input name="city" placeholder="City" />
 *           <input name="state" placeholder="State/Province" />
 *           <input name="country" placeholder="Country" />
 *         </div>
 *
 *         <div>
 *           <label>Contact Details (optional):</label>
 *           <input name="website" placeholder="Website URL" />
 *           <input name="phone" placeholder="Phone Number" />
 *           <textarea name="info" placeholder="Additional Information"></textarea>
 *         </div>
 *
 *         <button type="submit">Approve Institution</button>
 *         <button type="button" onClick={handleReject}>Reject</button>
 *       </form>
 *       ```
 *
 *       **React Hook Example:**
 *       ```javascript
 *       const [approvalData, setApprovalData] = useState({
 *         location: { city: '', state: '', country: '' },
 *         website: '',
 *         phone: '',
 *         info: ''
 *       });
 *
 *       const handleApproval = async (e) => {
 *         e.preventDefault();
 *         try {
 *           const response = await fetch(`/api/institutions/${institutionId}/approve-verification`, {
 *             method: 'POST',
 *             headers: {
 *               'Content-Type': 'application/json',
 *               'Authorization': `Bearer ${adminToken}`
 *             },
 *             body: JSON.stringify(approvalData)
 *           });
 *
 *           if (response.ok) {
 *             const result = await response.json();
 *             alert('Institution approved successfully!');
 *             // Refresh institution list
 *           } else {
 *             const error = await response.json();
 *             alert(`Error: ${error.error}`);
 *           }
 *         } catch (error) {
 *           console.error('Error:', error);
 *         }
 *       };
 *
 *       const handleReject = async () => {
 *         try {
 *           const response = await fetch(`/api/institutions/${institutionId}/reject-verification`, {
 *             method: 'POST',
 *             headers: {
 *               'Authorization': `Bearer ${adminToken}`
 *             }
 *           });
 *
 *           if (response.ok) {
 *             alert('Institution rejected');
 *             // Refresh institution list
 *           }
 *         } catch (error) {
 *           console.error('Error:', error);
 *         }
 *       };
 *       ```
 *
 *       **Quick Approval vs. Detailed Approval:**
 *
 *       **Quick Approval (just verify):**
 *       ```javascript
 *       // Send empty object - just approve without additional details
 *       await fetch(`/api/institutions/${id}/approve-verification`, {
 *         method: 'POST',
 *         headers: { 'Authorization': `Bearer ${token}` },
 *         body: JSON.stringify({})
 *       });
 *       ```
 *
 *       **Detailed Approval (add location/contact):**
 *       ```javascript
 *       await fetch(`/api/institutions/${id}/approve-verification`, {
 *         method: 'POST',
 *         headers: { 'Authorization': `Bearer ${token}` },
 *         body: JSON.stringify({
 *           location: {
 *             city: "Cambridge",
 *             state: "Massachusetts",
 *             country: "USA"
 *           },
 *           website: "https://mit.edu",
 *           phone: "617-253-1000",
 *           info: "Massachusetts Institute of Technology"
 *         })
 *       });
 *       ```
 *
 *       **Admin Dashboard Integration:**
 *       ```javascript
 *       // Get pending institution requests
 *       const getPendingInstitutions = async () => {
 *         const response = await fetch('/api/institutions?verificationRequested=true&isVerified=false');
 *         const institutions = await response.json();
 *         setPendingInstitutions(institutions);
 *       };
 *
 *       // Show approval form for each pending institution
 *       {pendingInstitutions.map(institution => (
 *         <div key={institution._id}>
 *           <h4>{institution.name} ({institution.type})</h4>
 *           <p>Domain: {institution.emailDomain}</p>
 *           <p>Requested: {new Date(institution.createdAt).toLocaleDateString()}</p>
 *           <InstitutionApprovalForm
 *             institutionId={institution._id}
 *             onApproved={getPendingInstitutions}
 *           />
 *         </div>
 *       ))}
 *       ```
 *
 *       **Notification Integration:**
 *       When an institution is approved, all users with that institution automatically
 *       get their `institutionVerificationStatus` updated to "verified".
 *
 *       Frontend should listen for user status changes and show appropriate UI:
 *       ```javascript
 *       useEffect(() => {
 *         if (user.institutionVerificationStatus === 'verified') {
 *           // Show success message
 *           setShowVerificationSuccess(true);
 *         }
 *       }, [user.institutionVerificationStatus]);
 *       ```
 *
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Institution ID to approve
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 description: Institution location details (all fields optional)
 *                 properties:
 *                   city: { type: string, description: 'City name', example: 'Cambridge' }
 *                   state: { type: string, description: 'State/Province name', example: 'Massachusetts' }
 *                   country: { type: string, description: 'Country name', example: 'USA' }
 *               website: { type: string, description: 'Institution website URL', example: 'https://mit.edu' }
 *               phone: { type: string, description: 'Institution phone number', example: '617-253-1000' }
 *               info: { type: string, description: 'Additional information about the institution', example: 'Massachusetts Institute of Technology' }
 *           examples:
 *             quick_approval:
 *               summary: Quick approval (just verify without additional details)
 *               value: {}
 *             detailed_approval:
 *               summary: Detailed approval with location and contact info
 *               value:
 *                 location:
 *                   city: "Cambridge"
 *                   state: "Massachusetts"
 *                   country: "USA"
 *                 website: "https://mit.edu"
 *                 phone: "617-253-1000"
 *                 info: "Massachusetts Institute of Technology"
 *     responses:
 *       200:
 *         description: Institution verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Institution verified successfully." }
 *                 institution:
 *                   type: object
 *                   properties:
 *                     id: { type: string, description: "Institution ID" }
 *                     name: { type: string, description: "Institution name" }
 *                     type: { type: string, description: "Institution type" }
 *                     emailDomain: { type: string, description: "Email domain" }
 *                     isVerified: { type: boolean, example: true }
 *                     location: { type: object, description: "Location details if provided" }
 *                     website: { type: string, description: "Website if provided" }
 *                     phone: { type: string, description: "Phone if provided" }
 *                     info: { type: string, description: "Additional info if provided" }
 *       403:
 *         description: Forbidden - user is not a platform admin
 *       404:
 *         description: Institution not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/approve-verification',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  approveInstitutionVerification,
);

/**
 * @swagger
 * /api/institutions/{id}/reject-verification:
 *   post:
 *     summary: Reject institution verification (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution verification rejected }
 *       403: { description: Forbidden }
 */
router.post(
  '/:id/reject-verification',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  rejectInstitutionVerification,
);

/**
 * @swagger
 * /api/institutions/{id}/analytics:
 *   get:
 *     summary: Get institution analytics (institution or admin)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution analytics }
 *       403: { description: Forbidden }
 */
router.get('/:id/analytics', authenticateToken, getInstitutionAnalytics);

/**
 * @swagger
 * /api/institutions/{id}/dashboard:
 *   get:
 *     summary: Get institution dashboard (institution or admin)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution dashboard }
 *       403: { description: Forbidden }
 */
router.get('/:id/dashboard', authenticateToken, getInstitutionDashboard);

module.exports = router;
