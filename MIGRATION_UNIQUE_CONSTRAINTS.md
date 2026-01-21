# Database Schema Update: Unique Constraints

## Changes Made

### 1. [User.js](file:///J:/MedBeacon-Backend/models/User.js)
- **Removed** `unique: true` from `username` field
- Username can now be duplicated across users
- Email remains unique

### 2. [PatientDetail.js](file:///J:/MedBeacon-Backend/models/PatientDetail.js)
- **Added** `unique: true` to `phoneNumber` field
- Phone numbers must be unique across all patients

### 3. [DoctorDetail.js](file:///J:/MedBeacon-Backend/models/DoctorDetail.js)
- **Added** `unique: true` to `phoneNumber` field
- Phone numbers must be unique across all doctors

---

## Current Unique Constraints

**User Model:**
- ✅ `id` (UUID)
- ✅ `email`
- ❌ `username` (removed)

**PatientDetail Model:**
- ✅ `userId`
- ✅ `phoneNumber` (new)

**DoctorDetail Model:**
- ✅ `userId`
- ✅ `phoneNumber` (new)

---

## Database Migration Required

> [!WARNING]
> **Important:** These schema changes require database migration to update indexes.

### For Existing Database

If you have existing data in MongoDB, you need to:

1. **Drop old username index:**
```javascript
db.users.dropIndex("username_1")
```

2. **Create new phone number indexes:**
```javascript
db.patientdetails.createIndex({ phoneNumber: 1 }, { unique: true })
db.doctordetails.createIndex({ phoneNumber: 1 }, { unique: true })
```

3. **Check for duplicate phone numbers:**
```javascript
// Check patients
db.patientdetails.aggregate([
  { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

// Check doctors
db.doctordetails.aggregate([
  { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

4. **If duplicates exist, clean them up before creating unique index**

### For New Database

If starting fresh, the indexes will be created automatically when the first document is inserted.

---

## Testing

After migration, test:
1. ✅ Can create users with same username
2. ✅ Cannot create users with same email
3. ✅ Cannot create patients with same phone number
4. ✅ Cannot create doctors with same phone number
5. ✅ Doctors and patients can have same phone number (different collections)

---

## Summary

✅ Username is no longer unique
✅ Email remains unique
✅ Phone number is now unique per role (patient/doctor)
