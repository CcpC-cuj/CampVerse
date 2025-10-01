# 🧪 RSVP System Testing Guide

## Quick Test Steps

### 1. Test Public Event RSVP (Logged In User)

**Steps:**
1. Open browser console (F12)
2. Log in to the application
3. Navigate to any public event page (e.g., `/events/public/:eventId`)
4. **Expected Initial State:**
   - Console shows: `📊 Public Event Response: { success: true, data: {...} }`
   - Console shows: `✅ User Registration Status: { isRegistered: false/true, userRegistration: null/object }`
   - If not registered: Button shows "Register for Event" (blue, enabled)
   - If already registered: Button shows "Already Registered" (green, disabled)

5. Click "Register for Event" button
6. **Expected Result:**
   - Console shows: `🎯 RSVP Action: { eventId: "...", isCurrentlyRsvped: false }`
   - Console shows: `📬 RSVP Response: { success: true, message: "..." }`
   - Alert: "RSVP successful! Check your email for the QR code."
   - Page reloads event data automatically
   - Console shows: `✅ User Registration Status: { isRegistered: true, userRegistration: {...} }`
   - Button changes to "Already Registered" (green, disabled)

7. Navigate to Dashboard > My Events
8. **Expected Result:**
   - Event appears in "Registered Events" tab
   - Event shows registration date and status

### 2. Test Duplicate RSVP Prevention

**Steps:**
1. After successful RSVP (from test 1), click "Already Registered" button
2. **Expected Result:**
   - Button is disabled, click does nothing
   - No API call made

3. Try to RSVP via API directly (if you know the event ID):
   ```bash
   curl -X POST http://localhost:5001/api/events/rsvp \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"eventId":"EVENT_ID"}'
   ```
4. **Expected Backend Log:**
   - `🎯 RSVP Request: { eventId: "...", userId: "..." }`
   - `⚠️ User already registered: { eventId: "...", userId: "...", status: "registered" }`
5. **Expected Response:**
   ```json
   {
     "success": false,
     "error": "User already registered for this event",
     "message": "You have already registered for this event"
   }
   ```

### 3. Test RSVP from Dashboard

**Steps:**
1. Navigate to Dashboard > Discover Events or Upcoming Events
2. Find an event you're NOT registered for
3. Click "RSVP" button on event card
4. **Expected Result:**
   - Alert: "RSVP successful! Check your email for the QR code."
   - Page automatically reloads all events
   - Event moves to "Registered Events" tab
   - Event disappears from "Upcoming Events" tab (no duplicate)

5. Refresh the page (F5)
6. **Expected Result:**
   - Event still in "Registered Events" tab
   - Event still shows correct registration status

### 4. Test Public Event for Anonymous User

**Steps:**
1. Log out or open incognito window
2. Navigate to any public event page
3. **Expected Result:**
   - Button shows "📝 Login to Register" (blue)
   - No "Already Registered" state
   - Console shows no authentication logs

4. Click "Login to Register" button
5. **Expected Result:**
   - Login modal opens
   - Can log in or switch to signup

### 5. Test Backend Logs

**Commands:**
```bash
# Watch backend logs in real-time
docker-compose logs -f backend

# Filter for RSVP-related logs
docker-compose logs -f backend | grep -E "RSVP|Event"

# Check specific RSVP
docker-compose logs backend | grep "eventId.*YOUR_EVENT_ID"
```

**Expected Log Pattern (Successful RSVP):**
```
backend-1  | 🎯 RSVP Request: { eventId: "66f...", userId: "66e..." }
backend-1  | ✅ RSVP Created: { eventId: "66f...", userId: "66e...", status: "registered", participationLogId: "..." }
```

**Expected Log Pattern (Duplicate RSVP Attempt):**
```
backend-1  | 🎯 RSVP Request: { eventId: "66f...", userId: "66e..." }
backend-1  | ⚠️ User already registered: { eventId: "66f...", userId: "66e...", status: "registered" }
```

**Expected Log Pattern (Public Event Check):**
```
backend-1  | 📊 Public Event Check: { eventId: "66f...", userId: "66e...", hasRegistration: true, registrationStatus: "registered" }
```

### 6. Test Database Verification

**Commands:**
```bash
# Connect to MongoDB container
docker-compose exec mongo mongosh campverse

# Check EventParticipationLog for specific user
db.eventparticipationlogs.find({ userId: ObjectId("YOUR_USER_ID") })

# Check specific event registration
db.eventparticipationlogs.find({ 
  eventId: ObjectId("YOUR_EVENT_ID"),
  userId: ObjectId("YOUR_USER_ID")
})

# Count registrations for event
db.eventparticipationlogs.countDocuments({ 
  eventId: ObjectId("YOUR_EVENT_ID"),
  status: "registered"
})
```

**Expected Result:**
- Document exists with `status: "registered"`
- `registeredAt` timestamp is present
- `qrToken` is a long hex string
- No duplicate documents for same user+event combination

### 7. Test Edge Cases

#### 7.1 Network Error Simulation
**Steps:**
1. RSVP for an event
2. During RSVP, disconnect network
3. **Expected Result:**
   - Frontend shows error: "RSVP failed. Please try again."
   - Page reloads event data when network reconnects
   - State is synced with backend

#### 7.2 Token Expiry
**Steps:**
1. Log in
2. Wait for token to expire (or manually clear token)
3. Try to RSVP
4. **Expected Result:**
   - AuthContext logs out user
   - Redirects to landing page
   - Shows "Login to Register" button

#### 7.3 Event Capacity Full
**Steps:**
1. Create event with small capacity (e.g., 2)
2. Have 2 users RSVP
3. Try to RSVP with 3rd user
4. **Expected Backend Log:**
   - `✅ RSVP Created: { ..., status: "waitlisted", ... }`
5. **Expected Result:**
   - User is registered with status "waitlisted"
   - Event shows "Waitlisted" badge in dashboard

## Debugging Checklist

If RSVP is not working:

1. ✅ Check browser console for error messages
2. ✅ Check backend logs: `docker-compose logs -f backend`
3. ✅ Verify user is authenticated: Check `localStorage.getItem('token')`
4. ✅ Verify event exists and is approved:
   ```bash
   docker-compose exec mongo mongosh campverse
   db.events.findOne({ _id: ObjectId("EVENT_ID") })
   ```
5. ✅ Check EventParticipationLog:
   ```bash
   db.eventparticipationlogs.find({ eventId: ObjectId("EVENT_ID") })
   ```
6. ✅ Check network requests in browser DevTools > Network tab
7. ✅ Verify API endpoints are responding:
   ```bash
   curl http://localhost:5001/api/events/public/EVENT_ID
   ```

## Success Criteria

All tests pass if:
- ✅ RSVP from public event page works
- ✅ Event appears in dashboard "Registered Events"
- ✅ Button shows "Already Registered" for registered events
- ✅ Duplicate RSVP is prevented (409 error)
- ✅ Backend logs show correct RSVP flow
- ✅ Database has correct EventParticipationLog entries
- ✅ Frontend and backend state are always in sync
- ✅ Anonymous users see "Login to Register"
- ✅ Error messages are clear and helpful

## Common Issues & Solutions

### Issue: Button doesn't update after RSVP
**Solution:** Check that `loadEvent()` is called after RSVP and `userRegistration` field is in response

### Issue: Event doesn't appear in dashboard
**Solution:** Check that `/api/events/user` endpoint returns the event and dashboard reloads data

### Issue: "Already registered" error but button shows "Register"
**Solution:** Backend has registration but frontend doesn't check it. Verify `getPublicEventById` returns `userRegistration`

### Issue: Multiple tabs show different states
**Solution:** Each tab reloads independently. Close other tabs and refresh current tab.

---

**Testing Complete!** 🎉
If all tests pass, the RSVP system is fully functional.
