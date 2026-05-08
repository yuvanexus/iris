# IRIS (IrisSync) — Project Documentation

> **Intelligent Real-time Identification System for School Bus Tracking & Attendance**
>
> This document provides a comprehensive, high-level overview of the IRIS project — its purpose, architecture, technologies, database design, application flow, user roles, and key features. It is intended to serve as a reference for generating a university project report.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure](#6-project-structure)
7. [Database Design & Schema](#7-database-design--schema)
8. [User Roles & Access Control](#8-user-roles--access-control)
9. [Module-wise Description](#9-module-wise-description)
10. [Application Flow](#10-application-flow)
11. [Key Features & Highlights](#11-key-features--highlights)
12. [API Architecture](#12-api-architecture)
13. [Security Mechanisms](#13-security-mechanisms)
14. [Offline Support & Resilience](#14-offline-support--resilience)
15. [Future Scope](#15-future-scope)

---

## 1. Project Overview

**IRIS (IrisSync)** is a full-stack web application designed to automate student attendance tracking on school buses using **AI-powered facial recognition**. The system combines **real-time GPS tracking**, **geofence-based auto-arrival detection**, and **browser-based face detection** to eliminate manual roll-calls and provide parents with live visibility into their child's bus journey.

The platform is built as a **client-server web application** with three distinct user interfaces — one each for **administrators**, **bus scanners** (face scanning devices), and **parents** — all served from a single codebase.

---

## 2. Problem Statement

Traditional school bus attendance tracking relies on manual headcounts or paper-based registers that are:

- **Error-prone** — students may be missed or double-counted.
- **Time-consuming** — delays boarding and alighting.
- **Opaque to parents** — no real-time information about whether a child has boarded, is in transit, or has arrived.
- **Difficult to audit** — paper records are hard to search, aggregate, or analyse historically.

IRIS addresses these challenges by leveraging modern web technologies and machine learning to provide **automated, real-time, and auditable** attendance tracking.

---

## 3. Objectives

1. **Automate Attendance** — Use face recognition to mark students as they board and exit buses, without any manual intervention.
2. **Real-time Bus Tracking** — Track bus locations via GPS and display them on interactive maps for parents and administrators.
3. **Geofence-based Arrival Detection** — Automatically detect when a bus arrives at the school/destination and bulk-exit all students.
4. **Role-based Dashboards** — Provide tailored dashboards for administrators (full control), scanners (face scanning), and parents (tracking & attendance).
5. **Offline Resilience** — Allow scanning to continue even without network connectivity, with automatic sync when connectivity is restored.
6. **Centralised Management** — Enable administrators to manage buses, students, departments, user accounts, and face registrations from a single admin panel.

---

## 4. System Architecture

IRIS follows a **two-tier client-server architecture**:

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                            │
│                                                                    │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐ │
│  │  Admin Panel │  │  Parent Portal  │  │  Scanner Interface     │ │
│  │  (React SPA) │  │  (React SPA)    │  │  (React + face-api.js) │ │
│  └──────┬──────┘  └───────┬─────────┘  └──────────┬─────────────┘ │
│         │                 │                        │               │
│         │    REST API calls (JSON over HTTPS)      │               │
│         └─────────────────┼────────────────────────┘               │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     SERVER (Express.js)                             │
│                                                                    │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │   Auth    │  │  Students  │  │  Buses   │  │  Face / Attend. │ │
│  │  Routes   │  │   Routes   │  │  Routes  │  │     Routes      │ │
│  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └───────┬─────────┘ │
│       │               │              │                │           │
│       │        Mongoose ODM (MongoDB Driver)          │           │
│       └───────────────┼──────────────┼────────────────┘           │
└───────────────────────┼──────────────┼────────────────────────────┘
                        │              │
                        ▼              ▼
              ┌──────────────────────────────┐
              │      MongoDB (NoSQL DB)       │
              │                              │
              │  Collections:                │
              │  users, studentprofiles,     │
              │  buses, buslocations,        │
              │  bustrips, attendances,      │
              │  facelandmarks, departments, │
              │  notifications               │
              └──────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Single-Page Application (SPA)** | Smooth, app-like experience without full page reloads; enables camera access for face scanning |
| **REST API** | Stateless, simple, widely supported; each endpoint maps to a clear resource and action |
| **MongoDB (NoSQL)** | Flexible schema for face descriptor arrays, extra student info, and location time-series data |
| **Client-side Face Recognition** | All face detection and matching runs in the browser via face-api.js — no images are sent to the server, preserving student privacy |
| **JWT Authentication** | Stateless tokens allow horizontal scaling and work well with SPAs |

---

## 5. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | JavaScript runtime for the server |
| **Express.js** | 4.21 | Web framework for building RESTful APIs |
| **MongoDB** | 6+ | NoSQL document database |
| **Mongoose** | 8.7 | Object Data Modelling (ODM) library for MongoDB |
| **JSON Web Tokens (JWT)** | 9.0 | Stateless authentication tokens |
| **bcrypt.js** | 2.4 | Password hashing (bcrypt algorithm) |
| **dotenv** | 16.4 | Environment variable management |
| **CORS** | 2.8 | Cross-Origin Resource Sharing middleware |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI component library |
| **Vite** | 7.3 | Build tool and dev server (fast HMR) |
| **TanStack Router** | 1.162 | File-based routing for React SPAs |
| **Tailwind CSS** | 4.2 | Utility-first CSS framework |
| **face-api.js** | 0.22 | Browser-based face detection & recognition (built on TensorFlow.js) |
| **Leaflet** | 1.9 | Interactive map rendering |
| **React-Leaflet** | 5.0 | React bindings for Leaflet |
| **Lucide React** | 0.575 | SVG icon library |
| **Web Speech API** | (built-in) | Text-to-Speech for greeting recognised students |
| **Web Audio API** | (built-in) | Audio melodies for scan confirmation feedback |

### AI / Machine Learning Models (face-api.js)

| Model | Purpose |
|---|---|
| **Tiny Face Detector** | Lightweight CNN for real-time face detection in video frames |
| **Face Landmark 68 Net** | Detects 68 facial landmarks for face alignment |
| **Face Recognition Net** | Generates 128-dimensional face descriptor vectors for identity matching |

---

## 6. Project Structure

```
IRIS/
├── express_backend/              # Backend API server
│   ├── config/
│   │   └── db.js                 # MongoDB connection setup
│   ├── middleware/
│   │   └── auth.js               # JWT authentication & role-based authorization
│   ├── models/                   # Mongoose schemas (9 models)
│   │   ├── User.js               # User accounts (admin, scanner, parent)
│   │   ├── StudentProfile.js     # Student profiles with parent linkage
│   │   ├── Bus.js                # Bus fleet with geofence configuration
│   │   ├── BusLocation.js        # GPS location time-series data
│   │   ├── BusTrip.js            # Trip start/end records
│   │   ├── Attendance.js         # Attendance records (boarding/exiting)
│   │   ├── FaceLandmark.js       # Face descriptor storage (128-D vectors)
│   │   ├── Department.js         # Academic departments
│   │   └── Notification.js       # User notifications
│   ├── routes/                   # API route handlers (7 route files)
│   │   ├── auth.js               # Registration, login, user management
│   │   ├── students.js           # Student profile CRUD
│   │   ├── buses.js              # Bus CRUD, location, trips, geofencing
│   │   ├── attendance.js         # Smart attendance marking & history
│   │   ├── face.js               # Face registration, encoding retrieval
│   │   ├── departments.js        # Department CRUD
│   │   └── notifications.js      # Notification CRUD
│   ├── server.js                 # Express app entry point, middleware, seeding
│   └── package.json
│
├── iris-frontend/                # Frontend SPA
│   ├── public/
│   │   └── models/               # face-api.js pre-trained model weights
│   ├── src/
│   │   ├── main.jsx              # App entry point (React root + router)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Global auth state (login, logout, user)
│   │   ├── lib/
│   │   │   └── api.js            # Centralised API endpoint URLs + fetch helper
│   │   ├── hooks/
│   │   │   └── useScannerAudio.js  # Web Audio + TTS hooks for scanner
│   │   ├── components/
│   │   │   ├── LiveBusMap.jsx    # Leaflet map component for bus tracking
│   │   │   ├── admin/
│   │   │   │   └── AttendanceCalendar.jsx
│   │   │   └── scanner/          # Scanner-specific UI components
│   │   │       ├── ScannerHeader.jsx
│   │   │       ├── ScanningAnimation.jsx
│   │   │       ├── NotificationToast.jsx
│   │   │       ├── RecognitionTab.jsx
│   │   │       ├── AccountTab.jsx
│   │   │       ├── GeneralTab.jsx
│   │   │       ├── SettingToggle.jsx
│   │   │       ├── SettingsNav.jsx
│   │   │       └── StatCard.jsx
│   │   └── routes/               # File-based routing (TanStack Router)
│   │       ├── __root.jsx        # Root layout with auth guard & redirection
│   │       ├── login.jsx         # Login page
│   │       ├── signup.jsx        # Registration page (parent signup)
│   │       ├── admin.jsx         # Admin layout with sidebar navigation
│   │       ├── admin/
│   │       │   ├── index.jsx     # Admin overview dashboard (stats)
│   │       │   ├── students/     # Student listing & detail pages
│   │       │   ├── buses/        # Bus management & detail with map
│   │       │   ├── attendance/   # Attendance today, by-date, calendar
│   │       │   ├── departments/  # Department CRUD
│   │       │   ├── users/        # User account management
│   │       │   ├── face-registration.jsx  # Face capture & registration UI
│   │       │   └── settings.jsx  # Admin settings
│   │       ├── scanner/
│   │       │   ├── index.jsx     # Full-screen face scanner (camera + AI)
│   │       │   └── settings.jsx  # Scanner device settings (TTS, GPS, etc.)
│   │       └── parent/
│   │           ├── index.jsx     # Parent overview dashboard
│   │           ├── profiles.jsx  # Child profile management
│   │           ├── attendance.jsx  # Child attendance history
│   │           ├── tracking.jsx  # Live bus tracking map
│   │           └── settings.jsx  # Parent account settings
│   ├── vite.config.js            # Vite config (React, Tailwind, TanStack Router, SSL)
│   └── package.json
│
└── api_documentation.md          # API endpoint reference
```

---

## 7. Database Design & Schema

The application uses **MongoDB**, a document-oriented NoSQL database. Data is organised into **9 collections**, modelled using Mongoose ODM schemas.

### Entity-Relationship Overview

```
              ┌───────────┐
              │   User    │
              │ (account) │
              └─────┬─────┘
                    │ 1:N
                    ▼
           ┌────────────────┐         ┌──────────────┐
           │ StudentProfile │────────▶│  Department  │
           │                │  N:1    │              │
           └───────┬────────┘         └──────────────┘
              │    │
         1:N  │    │ 1:N
              ▼    ▼
    ┌──────────┐  ┌──────────────┐
    │Attendance│  │ FaceLandmark │
    └─────┬────┘  └──────────────┘
          │ N:1
          ▼
     ┌─────────┐
     │   Bus   │
     └────┬────┘
          │ 1:N           1:N
     ┌────┴─────┐    ┌──────────┐
     │BusLocation│   │ BusTrip  │
     └──────────┘    └──────────┘
```

### Collection Schemas

#### 1. Users

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique identifier |
| `email` | String (unique, required) | User login email |
| `hashedPassword` | String (required) | bcrypt hashed password |
| `role` | String (enum) | One of: `admin`, `scanner`, `parent` |
| `fullName` | String | User's display name |
| `busId` | ObjectId (ref: Bus) | Assigned bus (used for scanner accounts) |
| `createdAt` | Date | Account creation timestamp |

#### 2. StudentProfile

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `parentId` | ObjectId (ref: User) | Linked parent account |
| `busId` | ObjectId (ref: Bus) | Assigned bus for this student |
| `name` | String (required) | Student's full name |
| `department` | ObjectId (ref: Department) | Academic department |
| `rollNumber` | String | University/school roll number |
| `contact` | String | Student's contact number |
| `address` | String | Home address |
| `parentContact` | String | Parent's contact number |
| `photoUrl` | String | Profile photo URL |
| `extraInfo` | Object | Flexible key-value store for additional data |

#### 3. Bus

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `busNumber` | String (unique, required) | Bus registration/fleet number |
| `routeName` | String | Name of the route (e.g., "City Centre Route") |
| `driverName` | String | Current driver's name |
| `driverContact` | String | Driver's phone number |
| `capacity` | Number | Seating capacity (default: 40) |
| `isActive` | Boolean | Whether the bus is currently in service |
| `state` | String (enum) | Current state: `on_the_way`, `stopped`, or `arrived` |
| `destinationLat` | Number | Destination geofence latitude |
| `destinationLng` | Number | Destination geofence longitude |
| `destinationRadius` | Number | Geofence trigger radius in metres (default: 100) |

#### 4. BusLocation

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `busId` | ObjectId (ref: Bus) | Which bus this location belongs to |
| `latitude` | Number (required) | GPS latitude |
| `longitude` | Number (required) | GPS longitude |
| `speed` | Number | Speed in km/h |
| `isStopped` | Boolean | Whether speed < 5 km/h |
| `timestamp` | Date | When this location was recorded |

#### 5. BusTrip

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `busId` | ObjectId (ref: Bus) | Associated bus |
| `departureTime` | Date | When the trip started |
| `arrivalTime` | Date | When the trip ended (null if active) |
| `isActive` | Boolean | Whether the trip is currently in progress |
| `createdAt` | Date | Record creation timestamp |

#### 6. Attendance

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `studentId` | ObjectId (ref: StudentProfile) | Which student |
| `busId` | ObjectId (ref: Bus) | Which bus |
| `status` | String (enum) | `present_in_bus` or `exited_from_bus` |
| `timestamp` | Date | When this record was created/updated |

#### 7. FaceLandmark

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `studentId` | ObjectId (ref: StudentProfile) | Associated student |
| `landmarksData` | Object | Raw facial landmark JSON (currently unused, reserved) |
| `encoding` | Array | Array of 128-dimensional Float32 face descriptor vectors |
| `createdAt` | Date | Registration timestamp |

#### 8. Department

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `name` | String (unique, required) | Short name (e.g., "CS", "BCA") |
| `fullName` | String | Full department name (e.g., "Computer Science") |
| `description` | String | Additional description |
| `createdAt` | Date | Creation timestamp |

#### 9. Notification

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier |
| `userId` | ObjectId (ref: User) | Target user |
| `title` | String (required) | Notification title |
| `message` | String (required) | Notification body text |
| `isRead` | Boolean | Read/unread status |
| `createdAt` | Date | When the notification was created |

---

## 8. User Roles & Access Control

The system implements **Role-Based Access Control (RBAC)** with three roles:

| Role | Description | Capabilities |
|---|---|---|
| **Admin** | System administrator | Full access: manage buses, students, departments, users, face registrations; view all attendance; access dashboard statistics |
| **Scanner** | Bus-mounted scanning device | Access face scanning interface; mark attendance; post GPS locations; view today's attendance |
| **Parent** | Student's parent/guardian | View linked children's profiles; view attendance history; track bus locations on a live map |

### Authentication Flow

1. User submits credentials (email + password) via the login form.
2. Backend verifies credentials against the bcrypt-hashed password in the database.
3. On success, the server issues a **JWT (JSON Web Token)** containing the user's email and role, valid for 24 hours.
4. The frontend stores the token in `localStorage` and includes it in the `Authorization: Bearer <token>` header for all subsequent API requests.
5. The backend middleware (`authenticate`) verifies the JWT on each request and resolves the user from the database.
6. The `requireRole` middleware restricts specific endpoints to authorised roles only.

### Automatic Role-based Routing

When a user logs in, the frontend root layout automatically redirects them to their role-specific dashboard:
- Admin → `/admin`
- Scanner → `/scanner`
- Parent → `/parent`

---

## 9. Module-wise Description

### 9.1 Authentication & User Management Module

**Backend:** `routes/auth.js` | **Frontend:** `login.jsx`, `signup.jsx`, `admin/users/`

- **Registration:** New users can self-register as parents. Admin can create scanner/admin accounts.
- **Login:** Email/password authentication returning a JWT token.
- **User Profile:** `GET /auth/me` returns the current authenticated user's profile.
- **User Administration (Admin):** List all users, view/edit individual user details, assign roles, assign buses to scanner accounts, reset passwords.
- **Default Seeding:** On first startup, the server automatically creates a default admin account (`admin@iris.com`) and a default scanner account (`scanner@iris.com`).

### 9.2 Student Profile Management Module

**Backend:** `routes/students.js` | **Frontend:** `admin/students/`, `parent/profiles.jsx`

- **Profile CRUD:** Create, read, update student profiles including name, roll number, department, contact info, and bus assignment.
- **Parent Linkage:** Each student profile is linked to a parent user, allowing parents to view their children's data.
- **Admin Override:** Administrators can update any student's profile, including reassigning parents and buses.
- **Department Association:** Students are linked to academic departments for organisational purposes.

### 9.3 Bus Fleet Management Module

**Backend:** `routes/buses.js` | **Frontend:** `admin/buses/`, `LiveBusMap.jsx`

- **Bus CRUD:** Create, read, update, and delete buses with details like bus number, route name, driver info, and capacity.
- **Bus State Machine:** Each bus has a state (`stopped` → `on_the_way` → `arrived`) that is automatically updated based on GPS speed data.
- **Geofence Configuration:** Administrators can set a destination coordinate (latitude, longitude) and a trigger radius for each bus.
- **Auto-Arrival Detection:** When a bus enters the geofence radius, the system automatically:
  1. Sets the bus state to `arrived`
  2. Bulk-marks all "present in bus" students as "exited from bus"
- **Manual Arrival:** Admins and scanners can also manually trigger bus arrival.
- **Cascade Deletion:** Deleting a bus automatically cleans up related locations, trips, attendance records, and unlinks students.

### 9.4 GPS Location Tracking Module

**Backend:** `routes/buses.js` (location endpoints) | **Frontend:** Scanner GPS watchPosition, `LiveBusMap.jsx`

- **Location Posting:** The scanner device continuously posts GPS coordinates to the server every 10 seconds using the browser's Geolocation API.
- **Motion Detection:** Speed is automatically calculated; buses moving < 5 km/h are marked as "stopped".
- **Location History:** All GPS pings are stored as time-series data, enabling route replay and history analysis.
- **Live Map Display:** Parents and admins can view bus positions on an interactive Leaflet map with real-time markers showing bus state, speed, and student count.
- **Haversine Distance Calculation:** The server uses the Haversine formula to calculate the distance between the bus and the destination for geofence checking.

### 9.5 Face Recognition & Registration Module

**Backend:** `routes/face.js` | **Frontend:** `admin/face-registration.jsx`, `scanner/index.jsx`

- **Face Registration (Admin):**
  1. Admin fills in student details (name, roll number, department, bus assignment).
  2. The webcam captures the student's face from multiple angles.
  3. `face-api.js` extracts 128-dimensional face descriptor vectors from each capture.
  4. The descriptors are sent to the server and stored alongside the student profile.

- **Face Scanning (Scanner Device):**
  1. The scanner loads pre-trained AI models (Tiny Face Detector, Face Landmark 68, Face Recognition Net) into the browser.
  2. Face descriptor vectors for all students assigned to the scanner's bus are fetched from the server and cached locally.
  3. A `FaceMatcher` is constructed from these descriptors with a distance threshold of 0.6.
  4. The camera feed is processed every 300ms — faces are detected, descriptors are extracted, and matched against registered students.
  5. On successful match (confidence > 70%), attendance is automatically marked.

- **Bus-Scoped Encodings:** The `/face/encodings?busId=<id>` endpoint returns only face data for students assigned to a specific bus, reducing data transfer and improving scanner performance.

- **Privacy-first Design:** Face images never leave the device. Only mathematical descriptor vectors (arrays of 128 floating-point numbers) are stored and transmitted.

### 9.6 Attendance Tracking Module

**Backend:** `routes/attendance.js` | **Frontend:** `admin/attendance/`, `parent/attendance.jsx`

- **Smart Idempotent Marking (`POST /attendance/mark`):**
  - First scan of the day → marks student as `present_in_bus` (boarding)
  - Subsequent scan when bus is stopped/arrived → marks as `exited_from_bus`
  - Scan when bus is moving → ignored (prevents accidental re-scans in transit)
  - Student already exited → no change (prevents double-exits)
  
- **Bulk Exit on Arrival:** When a bus arrives (manually or via geofence), all students currently marked as "present" are automatically moved to "exited".

- **Today's Attendance:** Real-time view of all attendance records for the current day, enriched with student names and roll numbers.

- **Historical Attendance:** View attendance records for any specific date. Available to admins and scanners.

- **Per-Student History:** Full attendance history for a specific student across all dates and buses.

- **Attendance Calendar (Admin):** A calendar view with daily attendance navigation.

### 9.7 Department Management Module

**Backend:** `routes/departments.js` | **Frontend:** `admin/departments/`

- **CRUD Operations:** Create, read, update, and delete academic departments.
- **Public Listing:** Department list is publicly accessible (no auth required) so that the registration form dropdown can load them.
- **Student Association:** Departments are referenced by student profiles for organisational grouping and reporting.

### 9.8 Notification Module

**Backend:** `routes/notifications.js` | **Frontend:** (consumed by parent dashboard)

- **Create Notifications:** Push notifications to specific users.
- **Read/Unread Filtering:** Retrieve all notifications or only unread ones.
- **Mark as Read / Delete:** Update notification status or remove them.

### 9.9 Parent Portal Module

**Frontend:** `parent/` (index, profiles, attendance, tracking, settings)

- **Overview Dashboard:** Displays a summary of the parent's linked children and their current bus status.
- **Child Profiles:** View and manage linked student profiles.
- **Attendance History:** View attendance records for each child with detailed timestamps.
- **Live Bus Tracking:** Interactive Leaflet map showing the real-time position of the child's assigned bus, including speed, state, and active student count.
- **Settings:** Account preferences and configuration.

---

## 10. Application Flow

### 10.1 System Startup Flow

```
Server starts
    │
    ├── Connect to MongoDB
    ├── Seed default admin (admin@iris.com / admin) if none exists
    ├── Seed default scanner (scanner@iris.com / scanner) if none exists
    └── Listen on port 8000 (all network interfaces)
```

### 10.2 Student Registration & Face Enrollment Flow

```
Admin logs in
    │
    ├── Navigate to "Face Registration" page
    ├── Fill in student details (name, roll number, department, bus)
    ├── Activate webcam
    ├── Capture 3 face descriptors from different angles
    ├── face-api.js extracts 128-D descriptor vectors (client-side)
    └── POST /face/register → stores student profile + face descriptors
```

### 10.3 Daily Bus Trip & Attendance Flow

```
Scanner device powers on → Scanner user logs in
    │
    ├── Load face-api.js AI models (Tiny Face Detector, Landmark 68, Recognition)
    ├── Fetch face encodings for assigned bus (GET /face/encodings?busId=X)
    ├── Cache encodings in localStorage (offline support)
    ├── Activate camera and GPS
    │
    ├── Bus departs → GPS speed > 5 km/h → state: "on_the_way"
    │   └── Location posted to server every 10 seconds
    │
    ├── Students board the bus
    │   ├── Camera detects face → face-api.js matches against FaceMatcher
    │   ├── Match found (distance < 0.6, confidence > 70%)
    │   ├── POST /attendance/mark (student_id, bus_id)
    │   ├── Server: first scan today → status: "present_in_bus"
    │   ├── Audio melody plays + TTS: "Welcome, <student name>"
    │   └── Toast notification displays student name & department
    │
    ├── Bus in transit → face scans are accepted but re-scans are cooldown-limited (8s)
    │   └── If bus moving and student already marked → scan ignored
    │
    ├── Bus arrives at destination
    │   ├── EITHER: GPS enters geofence radius → auto-arrival
    │   │   └── Server bulk-exits all "present" students
    │   ├── OR: Scanner manually triggers "Arrive" button
    │   │   └── Same bulk-exit happens
    │   └── OR: Re-scan when stopped → student status: "exited_from_bus"
    │
    └── Parents see real-time updates on their dashboard
        ├── Bus position on live map
        ├── Child's attendance status (present / exited)
        └── Notification when child boards or exits
```

### 10.4 Offline Scanning Flow

```
Scanner loses internet connectivity
    │
    ├── UI shows "Offline — scans saved locally" indicator
    ├── Face detection continues (models are pre-loaded, encodings are cached)
    ├── Attendance marks are queued in localStorage
    │
    └── When internet is restored
        ├── Queued records are synced to server sequentially
        ├── Failed syncs remain in queue for retry
        └── Queue count indicator updates in real-time
```

---

## 11. Key Features & Highlights

| Feature | Description |
|---|---|
| **AI-Powered Face Recognition** | Browser-based face detection and recognition using face-api.js — no server-side image processing needed |
| **Real-time GPS Tracking** | Live bus tracking with speed-based motion detection and interactive Leaflet maps |
| **Geofence Auto-Arrival** | Automatic arrival detection when the bus enters a configurable radius around the destination |
| **Offline-First Scanner** | Face scanning and attendance marking continue without internet; data syncs when connectivity returns |
| **Idempotent Smart Attendance** | Context-aware attendance marking that auto-detects boarding vs. exiting based on bus state |
| **Audio & Voice Feedback** | Configurable audio melodies and Text-to-Speech greetings on successful scans |
| **Role-Based Dashboards** | Three distinct, tailored interfaces for admins, scanners, and parents |
| **Privacy-Preserving Design** | Face images never leave the device — only mathematical descriptors are stored |
| **Dark Mode UI** | Modern, glassmorphic dark-themed design with responsive mobile layouts |
| **Default Account Seeding** | Automatic creation of admin and scanner accounts on first startup |
| **Bulk Student Exit** | All students auto-exited when bus arrives, eliminating manual checkout |

---

## 12. API Architecture

The backend exposes a RESTful API with the following route groups:

| Route Prefix | Module | Key Endpoints |
|---|---|---|
| `/auth` | Authentication & Users | `POST /login`, `POST /register`, `GET /me`, `GET /users`, `PUT /users/:id` |
| `/students` | Student Profiles | `POST /profile`, `GET /profile`, `GET /`, `PATCH /:id` |
| `/buses` | Bus Management | `POST /`, `GET /`, `PUT /:id`, `DELETE /:id`, `PUT /:id/state`, `POST /location`, `GET /:id/status`, `POST /:id/arrive` |
| `/attendance` | Attendance | `POST /mark`, `GET /today`, `GET /date/:date`, `GET /student/:id`, `GET /bus/:id` |
| `/face` | Face Recognition | `POST /register`, `GET /encodings`, `GET /landmarks/:id`, `GET /admin/stats` |
| `/departments` | Departments | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/notifications` | Notifications | `POST /`, `GET /user/:id`, `PUT /:id/read`, `DELETE /:id` |

### API Design Conventions

- **JSON request/response bodies** for all endpoints
- **10 MB request size limit** (to accommodate face descriptor arrays)
- **Consistent error format:** `{ "detail": "Error message" }`
- **snake_case naming** for all API fields (converted from camelCase Mongoose fields using format helper functions)
- **HTTP status codes:** 200 (success), 400 (bad request), 401 (unauthenticated), 403 (forbidden), 404 (not found), 500 (server error)

---

## 13. Security Mechanisms

| Mechanism | Implementation |
|---|---|
| **Password Hashing** | bcrypt with 10 salt rounds — passwords are never stored in plaintext |
| **JWT Authentication** | Tokens signed with a server-side secret (`JWT_SECRET` env variable), 24-hour expiry |
| **Role-Based Authorization** | `requireRole()` middleware restricts endpoints to specific roles |
| **CORS** | Cross-Origin Resource Sharing enabled for frontend-backend communication |
| **HTTPS (Dev)** | Vite dev server uses `@vitejs/plugin-basic-ssl` for HTTPS (required for camera access) |
| **Input Validation** | ObjectId validation helpers prevent NoSQL injection from malformed IDs |
| **Sensitive Data Masking** | Request logger masks passwords and truncates large face descriptor arrays in console output |
| **Client-Side Face Processing** | Face images are processed entirely in the browser — never transmitted to the server |

---

## 14. Offline Support & Resilience

IRIS is designed to operate reliably even in areas with intermittent internet connectivity:

1. **Face Encoding Cache:** When the scanner fetches face encodings from the server, they are cached in `localStorage`. If the scanner starts without internet, it uses the cached data.

2. **Offline Attendance Queue:** When attendance marks cannot be sent to the server (network failure), they are queued in `localStorage` with timestamps.

3. **Auto-Sync on Reconnect:** The application monitors online/offline events. When connectivity is restored, all queued attendance records are automatically synced with the server.

4. **Visual Indicators:** The scanner UI displays clear online/offline status and the number of queued records.

5. **AI Models Pre-loaded:** face-api.js models are loaded from static files served by the frontend, so face detection works entirely offline once models are loaded.

---

## 15. Future Scope

- **Push Notifications:** Integrate Firebase Cloud Messaging or WebSocket-based real-time push notifications for parents when their child boards or exits a bus.
- **Attendance Analytics:** Dashboard with charts showing attendance trends, peak boarding times, and punctuality reports.
- **Multi-School Deployment:** Extend the system to support multiple schools/institutions under a single deployment with tenant isolation.
- **Mobile Applications:** Build native iOS/Android apps using React Native for an improved parent experience.
- **Route Optimisation:** Use collected GPS data to suggest optimal bus routes.
- **Integration with School ERP:** Sync attendance data with existing school management systems.
- **Enhanced Face Security:** Implement liveness detection to prevent photo-based spoofing attacks.

---

> **Note for LLM Report Generation:** This document contains all the factual, technical, and architectural information about the IRIS project. Use this as the primary source to generate university report sections such as Introduction, Literature Review (context), System Design, Implementation, Testing, and Conclusion. All information is accurate and directly derived from the source code of the project.
