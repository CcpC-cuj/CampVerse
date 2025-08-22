# Frontend Developer Guide: Institution Management System

This guide explains how to implement the institution request and approval system in your frontend application.

## 🏛️ Overview

The institution system allows users to request new institutions and administrators to approve them. Institutions start as "unverified" and become "verified" after admin approval.

## 📋 User Flow

### 1. User Requests Institution

- User fills out simple form (name + type only)
- Institution created as "unverified"
- User status becomes "pending"
- Admin gets notified

### 2. Admin Reviews & Approves

- Admin sees pending requests
- Admin can approve with or without additional details
- If approved, all users get "verified" status

## 🎯 API Endpoints

### POST `/api/institutions/request-new`

**Purpose:** User requests new institution creation

**Required Fields:**

- `name`: Institution name
- `type`: Institution type (college/university/org/temporary)

**Optional Fields:**

- `website`: Institution website
- `phone`: Institution phone number
- `info`: Additional information

**Note:** Location fields are NOT collected from users - they're added by admins during approval.

### POST `/api/institutions/{id}/approve-verification`

**Purpose:** Admin approves institution verification

**Optional Fields (all optional):**

- `location.city`: City name
- `location.state`: State/Province
- `location.country`: Country
- `website`: Institution website
- `phone`: Institution phone
- `info`: Additional information

## 🚀 Implementation Examples

### User Request Form (React)

```jsx
import React, { useState } from "react";

const InstitutionRequestForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    website: "",
    phone: "",
    info: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/institutions/request-new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          "Institution request submitted! It will be reviewed by administrators.",
        );
        // Reset form or redirect
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="institution-form">
      <h2>Request New Institution</h2>

      <div className="form-group">
        <label htmlFor="name">Institution Name *</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., MIT University"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="type">Institution Type *</label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          required
        >
          <option value="">Select Type</option>
          <option value="college">College</option>
          <option value="university">University</option>
          <option value="org">Organization</option>
          <option value="temporary">Temporary</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="website">Website (Optional)</label>
        <input
          id="website"
          name="website"
          type="url"
          value={formData.website}
          onChange={(e) =>
            setFormData({ ...formData, website: e.target.value })
          }
          placeholder="https://example.edu"
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone (Optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="123-456-7890"
        />
      </div>

      <div className="form-group">
        <label htmlFor="info">Additional Information (Optional)</label>
        <textarea
          id="info"
          name="info"
          value={formData.info}
          onChange={(e) => setFormData({ ...formData, info: e.target.value })}
          placeholder="Tell us more about this institution..."
          rows="4"
        />
      </div>

      <button type="submit" className="submit-btn">
        Submit Request
      </button>
    </form>
  );
};

export default InstitutionRequestForm;
```

### Admin Approval Form (React)

```jsx
import React, { useState } from "react";

const InstitutionApprovalForm = ({ institution, onApproved, onRejected }) => {
  const [approvalData, setApprovalData] = useState({
    location: { city: "", state: "", country: "" },
    website: "",
    phone: "",
    info: "",
  });

  const handleApproval = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `/api/institutions/${institution._id}/approve-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify(approvalData),
        },
      );

      if (response.ok) {
        const result = await response.json();
        alert("Institution approved successfully!");
        onApproved();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRejection = async () => {
    try {
      const response = await fetch(
        `/api/institutions/${institution._id}/reject-verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        },
      );

      if (response.ok) {
        alert("Institution rejected");
        onRejected();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="approval-form">
      <h3>Approve Institution: {institution.name}</h3>
      <p>
        <strong>Type:</strong> {institution.type}
      </p>
      <p>
        <strong>Domain:</strong> {institution.emailDomain}
      </p>
      <p>
        <strong>Requested:</strong>{" "}
        {new Date(institution.createdAt).toLocaleDateString()}
      </p>

      <form onSubmit={handleApproval}>
        <div className="form-section">
          <h4>Location Details (Optional)</h4>
          <div className="form-row">
            <input
              name="city"
              placeholder="City"
              value={approvalData.location.city}
              onChange={(e) =>
                setApprovalData({
                  ...approvalData,
                  location: { ...approvalData.location, city: e.target.value },
                })
              }
            />
            <input
              name="state"
              placeholder="State/Province"
              value={approvalData.location.state}
              onChange={(e) =>
                setApprovalData({
                  ...approvalData,
                  location: { ...approvalData.location, state: e.target.value },
                })
              }
            />
            <input
              name="country"
              placeholder="Country"
              value={approvalData.location.country}
              onChange={(e) =>
                setApprovalData({
                  ...approvalData,
                  location: {
                    ...approvalData.location,
                    country: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="form-section">
          <h4>Contact Details (Optional)</h4>
          <input
            name="website"
            type="url"
            placeholder="Website URL"
            value={approvalData.website}
            onChange={(e) =>
              setApprovalData({ ...approvalData, website: e.target.value })
            }
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            value={approvalData.phone}
            onChange={(e) =>
              setApprovalData({ ...approvalData, phone: e.target.value })
            }
          />
          <textarea
            name="info"
            placeholder="Additional Information"
            value={approvalData.info}
            onChange={(e) =>
              setApprovalData({ ...approvalData, info: e.target.value })
            }
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="approve-btn">
            Approve Institution
          </button>
          <button
            type="button"
            onClick={handleRejection}
            className="reject-btn"
          >
            Reject Institution
          </button>
        </div>
      </form>
    </div>
  );
};

export default InstitutionApprovalForm;
```

### Admin Dashboard (React)

```jsx
import React, { useState, useEffect } from "react";
import InstitutionApprovalForm from "./InstitutionApprovalForm";

const AdminDashboard = () => {
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingInstitutions();
  }, []);

  const fetchPendingInstitutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/institutions?verificationRequested=true&isVerified=false",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        },
      );

      if (response.ok) {
        const institutions = await response.json();
        setPendingInstitutions(institutions);
      }
    } catch (error) {
      console.error("Error fetching pending institutions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h1>Institution Approval Dashboard</h1>

      {pendingInstitutions.length === 0 ? (
        <p>No pending institution requests</p>
      ) : (
        <div className="pending-institutions">
          <h2>Pending Requests ({pendingInstitutions.length})</h2>

          {pendingInstitutions.map((institution) => (
            <div key={institution._id} className="institution-card">
              <InstitutionApprovalForm
                institution={institution}
                onApproved={fetchPendingInstitutions}
                onRejected={fetchPendingInstitutions}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
```

### Status Tracking Component

```jsx
import React, { useState, useEffect } from "react";

const InstitutionStatus = ({ user }) => {
  const [status, setStatus] = useState(user.institutionVerificationStatus);

  useEffect(() => {
    setStatus(user.institutionVerificationStatus);
  }, [user.institutionVerificationStatus]);

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return {
          text: "Your institution request is pending review",
          type: "warning",
          icon: "⏳",
        };
      case "verified":
        return {
          text: "Your institution has been verified!",
          type: "success",
          icon: "✅",
        };
      case "rejected":
        return {
          text: "Your institution request was rejected",
          type: "error",
          icon: "❌",
        };
      default:
        return {
          text: "No institution status",
          type: "info",
          icon: "ℹ️",
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className={`status-banner status-${statusInfo.type}`}>
      <span className="status-icon">{statusInfo.icon}</span>
      <span className="status-text">{statusInfo.text}</span>
    </div>
  );
};

export default InstitutionStatus;
```

## 🎨 CSS Styling Examples

```css
/* Institution Form Styles */
.institution-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.submit-btn {
  background: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
}

.submit-btn:hover {
  background: #0056b3;
}

/* Approval Form Styles */
.approval-form {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 20px;
}

.form-section h4 {
  margin-bottom: 10px;
  color: #495057;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.approve-btn {
  background: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
}

.reject-btn {
  background: #dc3545;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
}

/* Status Banner Styles */
.status-banner {
  padding: 12px 16px;
  border-radius: 6px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status-info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
```

## 🔍 Error Handling

### Common Error Scenarios

1. **400 - Validation Error**
   - Missing required fields (name, type)
   - Invalid institution type

2. **409 - Conflict**
   - Institution with same email domain already exists

3. **500 - Server Error**
   - Database connection issues
   - Internal server errors

### Error Handling Example

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("/api/institutions/request-new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const result = await response.json();
      showSuccess("Institution request submitted successfully!");
    } else {
      const error = await response.json();

      switch (response.status) {
        case 400:
          showError(`Validation Error: ${error.error}`);
          if (error.details) {
            console.log("Validation details:", error.details);
          }
          break;
        case 409:
          showError(`Conflict: ${error.error}`);
          if (error.existingInstitution) {
            console.log("Existing institution:", error.existingInstitution);
          }
          break;
        default:
          showError(`Error: ${error.error}`);
      }
    }
  } catch (error) {
    console.error("Network error:", error);
    showError("Network error. Please try again.");
  }
};
```

## 📱 Mobile Considerations

- Use appropriate input types (`tel`, `url`, `email`)
- Ensure form fields are large enough for mobile touch
- Consider using a stepper form for complex approval processes
- Test on various screen sizes

## 🧪 Testing

### Test Cases

1. **User Request Form**
   - Submit with only required fields
   - Submit with all fields filled
   - Submit with invalid data
   - Test form validation

2. **Admin Approval**
   - Quick approval (empty body)
   - Detailed approval (with location/contact)
   - Rejection flow
   - Error handling

3. **Status Updates**
   - Verify user status changes after approval
   - Check notification system
   - Test real-time updates

## 🔗 Integration Points

- **User Authentication**: Ensure JWT token is included
- **Role-Based Access**: Check user roles for admin functions
- **Real-time Updates**: Consider WebSocket for status changes
- **Notifications**: Integrate with your notification system

## 📚 Additional Resources

- Check the Swagger UI at `/api-docs` for interactive API documentation
- Review the backend models for data structure details
- Test endpoints using Postman or similar tools

---

**Need Help?** Check the backend console logs for detailed debugging information when testing the endpoints.
