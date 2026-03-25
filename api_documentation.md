# IRIS Backend API Documentation (with Request/Response Structures)

This document outlines all the REST API endpoints available in the IRIS Python FastAPI backend, including the JSON shapes for requests (Body) and responses to assist with your Next.js frontend migration.

---

## 1. Authentication & Users
**Prefix:** `/auth`

### `POST /auth/register`
- **Description:** Register a new user in the system.
- **Request Body ([UserCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#9-14)):**
  ```json
  {
    "email": "string",
    "password": "string",
    "role": "parent", // default: "parent", others: "scanner", "admin"
    "full_name": "string" // default: ""
  }
  ```
- **Response ([UserOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#19-27)):**
  ```json
  {
    "id": 1,
    "email": "string",
    "role": "string",
    "full_name": "string",
    "created_at": "2023-10-01T12:00:00Z"
  }
  ```

### `POST /auth/login`
- **Description:** Login and obtain an access token.
- **Request (FormData - `OAuth2PasswordRequestForm`):**
  - `username`: "string" (email)
  - `password`: "string"
- **Response ([Token](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#29-32)):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer"
  }
  ```

### `GET /auth/me`
- **Description:** Get the profile of the currently authenticated user.
- **Response ([UserOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#19-27)):** Same as `/auth/register` response.

### `GET /auth/users`
- **Description:** List all registered users. (Admin only)
- **Response:** Array of [UserOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#19-27) objects.

### `PATCH /auth/users/{user_id}/role`
- **Description:** Update the role of a user. (Admin only)
- **Request Body:**
  ```json
  {
    "role": "string" // "scanner", "parent", "admin"
  }
  ```
- **Response ([UserOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#19-27)):** The updated user object.

---

## 2. Students & Profiles
**Prefix:** `/students`

### `POST /students/profile`
- **Description:** Create or update a student profile (matched by roll number) for the current user.
- **Request Body ([StudentProfileCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#36-46)):**
  ```json
  {
    "name": "string",
    "department": "string",      // optional
    "contact": "string",         // optional
    "address": "string",         // optional
    "roll_number": "string",     // optional (used for matching updates)
    "parent_contact": "string",  // optional
    "photo_url": "string",       // optional
    "bus_id": 1,                 // optional (integer or null)
    "extra_info": {}             // optional (JSON object)
  }
  ```
- **Response ([StudentProfileOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#48-62)):**
  ```json
  {
    "id": 1,
    "parent_id": 2, // The user ID of the parent
    "name": "string",
    "department": "string",
    "contact": "string",
    "address": "string",
    "roll_number": "string",
    "parent_contact": "string",
    "photo_url": "string",
    "bus_id": 1,
    "extra_info": {}
  }
  ```

### `GET /students/profile`
- **Description:** List all student profiles linked to the current user (parent).
- **Response:** Array of [StudentProfileOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#48-62) objects.

### `GET /students/profile/{student_id}`
- **Description:** Get detailed profile of a specific student by ID.
- **Response ([StudentProfileOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#48-62)):** Single student object.

### `GET /students/`
- **Description:** List all students in the system.
- **Response:** Array of [StudentProfileOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#48-62) objects.

### `PATCH /students/{student_id}`
- **Description:** Partially update a student definition. (Admin only)
- **Request Body ([StudentUpdate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#215-225) - all fields optional):**
  ```json
  {
    "name": "string",
    "department": "string",
    "contact": "string",
    "address": "string",
    "roll_number": "string",
    "parent_contact": "string",
    "photo_url": "string",
    "bus_id": 1,
    "parent_id": 2
  }
  ```
- **Response ([StudentProfileOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#48-62)):** The updated student object.

---

## 3. Buses & Fleet Management
**Prefix:** `/buses`

### `POST /buses/`
- **Description:** Register a new bus. (Admin only)
- **Request Body ([BusCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#66-72)):**
  ```json
  {
    "bus_number": "string",
    "route_name": "string",     // optional
    "driver_name": "string",    // optional
    "driver_contact": "string", // optional
    "capacity": 40              // default: 40
  }
  ```
- **Response ([BusOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#74-85)):**
  ```json
  {
    "id": 1,
    "bus_number": "string",
    "route_name": "string",
    "driver_name": "string",
    "driver_contact": "string",
    "capacity": 40,
    "is_active": true,
    "state": "stopped"
  }
  ```

### `GET /buses/` & `GET /buses/{bus_id}`
- **Description:** List all buses or get a specific bus.
- **Response ([BusOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#74-85) / Array of [BusOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#74-85)):** Bus objects as defined above.

### `DELETE /buses/{bus_id}`
- **Description:** Delete a bus. (Admin only)
- **Response:** `{"message": "Bus deleted successfully"}`

### `PUT /buses/{bus_id}/state`
- **Description:** Update the temporal state of the bus.
- **Request Body ([BusStateUpdate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#87-89)):**
  ```json
  {
    "state": "string" // "on_the_way", "stopped", "arrived"
  }
  ```
- **Response ([BusOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#74-85)):** The updated bus object.

### `GET /buses/{bus_id}/status`
- **Description:** Get a real-time snapshot of the bus.
- **Response ([BusStatusOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#229-235)):**
  ```json
  {
    "bus": { /* BusOut Object */ },
    "current_location": { /* Optional BusLocationOut Object */ },
    "active_trip": { /* Optional BusTripOut Object */ },
    "students_present": 15,
    "is_stopped": true
  }
  ```

### `POST /buses/location`
- **Description:** Post a new location ping for a bus.
- **Request Body ([BusLocationCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#93-99)):**
  ```json
  {
    "bus_id": 1,
    "latitude": 34.0522,
    "longitude": -118.2437,
    "speed": 0.0,        // optional
    "is_stopped": false  // optional
  }
  ```
- **Response ([BusLocationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#101-111)):**
  ```json
  {
    "id": 1,
    "bus_id": 1,
    "latitude": 34.0522,
    "longitude": -118.2437,
    "speed": 0.0,
    "is_stopped": false,
    "timestamp": "2023-10-01T12:00:00Z"
  }
  ```

### `GET /buses/{bus_id}/location` & `GET /buses/{bus_id}/location/history`
- **Description:** Get current location or history (supports `?start=` and `?end=` query params for history).
- **Response:** Single [BusLocationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#101-111) or Array of [BusLocationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#101-111).

### `POST /buses/trips`
- **Description:** Start a new trip.
- **Request Body ([BusTripCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#115-118)):**
  ```json
  {
    "bus_id": 1,
    "departure_time": "2023-10-01T12:00:00Z" // optional
  }
  ```
- **Response ([BusTripOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#120-129)):**
  ```json
  {
    "id": 1,
    "bus_id": 1,
    "departure_time": "2023-10-01T12:00:00Z",
    "arrival_time": null,
    "is_active": true,
    "created_at": "2023-10-01T12:00:00Z"
  }
  ```

### `PUT /buses/trips/{trip_id}/end`
- **Description:** Mark trip as completed.
- **Response ([BusTripOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#120-129)):** Updated trip object with `arrival_time` set and `is_active` false.

### `GET /buses/{bus_id}/students`
- **Description:** Get attendance records logged for a given bus.
- **Response:** Array of [AttendanceOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#140-148) objects (see Attendance section).

---

## 4. Attendance
**Prefix:** `/attendance`

### `POST /attendance/mark` (Preferred Idempotent Endpoint)
- **Description:** Safely mark attendance considering bus context.
- **Request Body ([AttendanceCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#133-138)):**
  ```json
  {
    "student_id": 1,
    "bus_id": 1,
    "status": "present_in_bus", // default
    "bus_state": "stopped"      // optional: "on_the_way", "stopped", "arrived"
  }
  ```
- **Response ([AttendanceMarkResponse](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#150-161)):**
  ```json
  {
    "id": 1,
    "student_id": 1,
    "bus_id": 1,
    "status": "string", // "present_in_bus" or "exited_from_bus"
    "timestamp": "2023-10-01T12:00:00Z",
    "already_marked": false,
    "student_name": "John Doe"
  }
  ```

### `POST /attendance/` (Legacy)
- **Description:** Force mark attendance.
- **Request Body:** Same as `/attendance/mark`.
- **Response ([AttendanceOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#140-148)):** Identical to [AttendanceMarkResponse](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#150-161) but without `already_marked` and `student_name`.

### `GET /attendance/today`
- **Description:** List today's attendance records.
- **Response (Array of [AttendanceTodayOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#163-174)):**
  ```json
  [
    {
      "id": 1,
      "student_id": 1,
      "bus_id": 1,
      "status": "present_in_bus",
      "timestamp": "2023-10-01T12:00:00Z",
      "student_name": "John Doe",
      "roll_number": "101"
    }
  ]
  ```

### `GET /attendance/student/{student_id}` & `GET /attendance/bus/{bus_id}`
- **Description:** Retrieve historical logs.
- **Response:** Array of [AttendanceOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#140-148) objects.

---

## 5. Face Recognition & Registration
**Prefix:** `/face`

### `POST /face/register`
- **Description:** Composite endpoint to register face data. (Admin only)
- **Request Body ([FaceRegistrationRequest](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#239-252)):**
  ```json
  {
    "name": "string",
    "roll_number": "string",
    "department": "string",      // optional
    "contact": "string",         // optional
    "address": "string",         // optional
    "parent_name": "string",     // optional
    "parent_contact": "string",  // optional
    "parent_id": 1,              // optional
    "bus_id": 1,                 // optional
    "descriptors": [[...], [...], [...]] // List of 3 float arrays representing face encodings
  }
  ```
- **Response ([FaceRegistrationResponse](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#254-258)):**
  ```json
  {
    "student_id": 1,
    "landmark_id": 1,
    "message": "Registration successful"
  }
  ```

### `GET /face/encodings`
- **Description:** Retrieve registered face descriptors.
- **Response (Array of dicts):**
  ```json
  [
    {
      "student_id": 1,
      "name": "string",
      "roll_number": "string",
      "department": "string",
      "descriptors": [[...], [...], [...]] // List of 3 float arrays
    }
  ]
  ```

### `POST /face/landmarks`
- **Description:** Manually store landmarks.
- **Request Body ([FaceLandmarkCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#178-182)):**
  ```json
  {
    "student_id": 1,
    "landmarks_data": {}, // Arbitrary JSON
    "encoding": []        // Optional
  }
  ```
- **Response ([FaceLandmarkOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#184-192)):** Landamrk record with ID and created_at.

### `GET /face/admin/stats`
- **Description:** Dashboard aggregate stats.
- **Response:**
  ```json
  {
    "total_students": 100,
    "total_landmarks": 80,
    "total_buses": 5,
    "students_on_bus": 15,
    "total_attendance": 200
  }
  ```

---

## 6. Notifications
**Prefix:** `/notifications`

### `POST /notifications/`
- **Description:** Create a new notification.
- **Request Body ([NotificationCreate](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#196-200)):**
  ```json
  {
    "user_id": 1,
    "title": "string",
    "message": "string"
  }
  ```
- **Response ([NotificationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#202-211)):**
  ```json
  {
    "id": 1,
    "user_id": 1,
    "title": "string",
    "message": "string",
    "is_read": false,
    "created_at": "2023-10-01T12:00:00Z"
  }
  ```

### `GET /notifications/user/{user_id}`
- **Description:** Get all notifications, optional query `?unread_only=true`.
- **Response:** Array of [NotificationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#202-211) objects.

### `PUT /notifications/{notif_id}/read`
- **Description:** Mark as read.
- **Response:** The updated [NotificationOut](file:///e:/workspace/IT/IRIS/backend/app/schemas.py#202-211) object.

### `DELETE /notifications/{notif_id}`
- **Description:** Remove notification entirely.
- **Response:** `{"detail": "Deleted"}`
