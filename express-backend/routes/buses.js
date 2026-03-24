const express = require("express");
const router = express.Router();
const Bus = require("../models/Bus");
const BusLocation = require("../models/BusLocation");
const BusTrip = require("../models/BusTrip");
const Attendance = require("../models/Attendance");
const StudentProfile = require("../models/StudentProfile");
const { authenticate, requireRole } = require("../middleware/auth");
const { notifyParentsBusArrived, notifyParentExit } = require("../services/notifyParent");

// ── Haversine distance (returns metres) ───────────────
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Bus CRUD ───────────────────────────────────────────

// POST /buses/ — create a bus (admin only)
router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const bus = await Bus.create({
      busNumber: req.body.bus_number,
      routeName: req.body.route_name || "",
      driverName: req.body.driver_name || "",
      driverContact: req.body.driver_contact || "",
      capacity: req.body.capacity || 40,
    });
    res.json(formatBus(bus));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /buses/ — list all buses
router.get("/", async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json(buses.map(formatBus));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /buses/:busId — get single bus
router.get("/:busId", async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) return res.status(404).json({ detail: "Bus not found" });
    res.json(formatBus(bus));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /buses/:busId — update a bus (admin only)
router.put("/:busId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) return res.status(404).json({ detail: "Bus not found" });

    if (req.body.bus_number !== undefined) bus.busNumber = req.body.bus_number;
    if (req.body.route_name !== undefined) bus.routeName = req.body.route_name;
    if (req.body.driver_name !== undefined) bus.driverName = req.body.driver_name;
    if (req.body.driver_contact !== undefined) bus.driverContact = req.body.driver_contact;
    if (req.body.capacity !== undefined) bus.capacity = req.body.capacity;
    if (req.body.is_active !== undefined) bus.isActive = req.body.is_active;
    // ── Destination geofence fields ──────────────────
    if (req.body.destination_lat !== undefined) bus.destinationLat = req.body.destination_lat;
    if (req.body.destination_lng !== undefined) bus.destinationLng = req.body.destination_lng;
    if (req.body.destination_radius !== undefined) bus.destinationRadius = req.body.destination_radius;

    await bus.save();
    console.log(`[BUS] ✏️  Bus #${bus.busNumber} updated`);
    res.json(formatBus(bus));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /buses/:busId — delete a bus (admin only)
router.delete("/:busId", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const busId = req.params.busId;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ detail: "Bus not found" });

    // Unlink students and clean up related data
    await StudentProfile.updateMany({ busId }, { busId: null });
    await BusLocation.deleteMany({ busId });
    await BusTrip.deleteMany({ busId });
    await Attendance.deleteMany({ busId });
    await Bus.findByIdAndDelete(busId);

    res.json({ message: "Bus deleted successfully" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Bus state ──────────────────────────────────────────

// PUT /buses/:busId/state — manually update bus state
router.put("/:busId/state", async (req, res) => {
  try {
    const { state } = req.body;
    if (!["on_the_way", "stopped", "arrived"].includes(state)) {
      return res.status(400).json({ detail: "Invalid state. Must be: on_the_way, stopped, arrived" });
    }
    const bus = await Bus.findByIdAndUpdate(req.params.busId, { state }, { new: true });
    if (!bus) return res.status(404).json({ detail: "Bus not found" });
    
    console.log(`[BUS] 🔄 Bus #${bus.busNumber} state manually updated to: ${state}`);
    res.json(formatBus(bus));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Location tracking ──────────────────────────────────

// POST /buses/location — post a GPS ping
// Auto-detects motion from speed (< 5 km/h = stopped)
// Also checks geofence: if within destinationRadius, auto-triggers arrival
router.post("/location", async (req, res) => {
  try {
    const { bus_id, latitude, longitude, speed = 0 } = req.body;

    const isStopped = speed < 5;

    const loc = await BusLocation.create({
      busId: bus_id,
      latitude,
      longitude,
      speed,
      isStopped,
    });

    // Fetch current bus to check geofence and current state
    const bus = await Bus.findById(bus_id);
    if (!bus) return res.json(formatLocation(loc));

    let autoArrived = false;

    // ── Geofence check ────────────────────────────────
    if (
      bus.destinationLat != null &&
      bus.destinationLng != null &&
      bus.state !== "arrived"
    ) {
      const dist = haversineMetres(
        latitude, longitude,
        bus.destinationLat, bus.destinationLng
      );
      const radius = bus.destinationRadius ?? 100;

      if (dist <= radius) {
        // Bus has entered the geofence — trigger arrival
        bus.state = "arrived";
        await bus.save();

        // Bulk-exit all students currently on board today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const result = await Attendance.updateMany(
          { busId: bus_id, status: "present_in_bus", timestamp: { $gte: todayStart, $lte: todayEnd } },
          { status: "exited_from_bus", timestamp: new Date() }
        );

        autoArrived = true;
        console.log(
          `[BUS] 🏫 Bus #${bus.busNumber} entered geofence (${dist.toFixed(0)}m away). ` +
          `Auto-arrived: ${result.modifiedCount} student(s) exited.`
        );

        // Email all parents that bus has arrived
        notifyParentsBusArrived(bus_id);
      } else {
        // Not in geofence — update motion state normally
        bus.state = isStopped ? "stopped" : "on_the_way";
        await bus.save();
      }
    } else if (bus.state !== "arrived") {
      // No geofence configured — update motion state normally
      bus.state = isStopped ? "stopped" : "on_the_way";
      await bus.save();
    }
    // If already arrived, don't overwrite state with GPS tick

    res.json({ ...formatLocation(loc), auto_arrived: autoArrived });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /buses/:busId/arrive — manual arrive (admin or scanner)
// Sets bus state to arrived and bulk-exits all students on board today
router.post("/:busId/arrive", authenticate, requireRole("admin", "scanner"), async (req, res) => {
  try {
    const busId = req.params.busId;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ detail: "Bus not found" });

    bus.state = "arrived";
    await bus.save();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await Attendance.updateMany(
      { busId, status: "present_in_bus", timestamp: { $gte: todayStart, $lte: todayEnd } },
      { status: "exited_from_bus", timestamp: new Date() }
    );

    console.log(
      `[BUS] 🏫 Bus #${bus.busNumber} manually marked as arrived. ` +
      `${result.modifiedCount} student(s) bulk-exited.`
    );

    // Email all parents that bus has arrived
    notifyParentsBusArrived(busId);

    res.json({
      state: "arrived",
      bus_id: busId,
      students_exited: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /buses/:busId/location — get latest location
router.get("/:busId/location", async (req, res) => {
  try {
    const loc = await BusLocation.findOne({ busId: req.params.busId })
      .sort({ timestamp: -1 });
    res.json(loc ? formatLocation(loc) : null);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /buses/:busId/location/history — location history with optional date range
router.get("/:busId/location/history", async (req, res) => {
  try {
    const { start, end, limit = 200 } = req.query;
    const filter = { busId: req.params.busId };

    if (start) filter.timestamp = { ...filter.timestamp, $gte: new Date(start) };
    if (end) filter.timestamp = { ...filter.timestamp, $lte: new Date(end) };

    const locations = await BusLocation.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json(locations.map(formatLocation));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Trips ──────────────────────────────────────────────

// POST /buses/trips — start a new trip
router.post("/trips", async (req, res) => {
  try {
    const trip = await BusTrip.create({
      busId: req.body.bus_id,
      departureTime: req.body.departure_time || new Date(),
    });
    console.log(`[BUS] 🛑 Started new trip for Bus #${req.body.bus_id}`);
    res.json(formatTrip(trip));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT /buses/trips/:tripId/end — end a trip
router.put("/trips/:tripId/end", async (req, res) => {
  try {
    const trip = await BusTrip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: "Trip not found" });

    trip.isActive = false;
    trip.arrivalTime = new Date();
    await trip.save();

    console.log(`[BUS] 🏁 Ended trip for Bus #${trip.busId}`);
    res.json(formatTrip(trip));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Full bus status ────────────────────────────────────

// GET /buses/:busId/status — composite snapshot
router.get("/:busId/status", async (req, res) => {
  try {
    const busId = req.params.busId;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ detail: "Bus not found" });

    const latestLoc = await BusLocation.findOne({ busId }).sort({ timestamp: -1 });
    const activeTrip = await BusTrip.findOne({ busId, isActive: true });

    // Count only students present TODAY (not all-time historic records)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const studentsPresent = await Attendance.countDocuments({
      busId,
      status: "present_in_bus",
      timestamp: { $gte: todayStart, $lte: todayEnd },
    });

    res.json({
      bus: formatBus(bus),
      current_location: latestLoc ? formatLocation(latestLoc) : null,
      active_trip: activeTrip ? formatTrip(activeTrip) : null,
      students_present: studentsPresent,
      is_stopped: latestLoc ? latestLoc.isStopped : true,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Bus students (attendance link) ─────────────────────

// GET /buses/:busId/students — attendance records for a bus
router.get("/:busId/students", async (req, res) => {
  try {
    const records = await Attendance.find({ busId: req.params.busId })
      .sort({ timestamp: -1 });
    res.json(records.map(formatAttendance));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Format helpers ─────────────────────────────────────

function formatBus(b) {
  return {
    id: b._id,
    bus_number: b.busNumber,
    route_name: b.routeName,
    driver_name: b.driverName,
    driver_contact: b.driverContact,
    capacity: b.capacity,
    is_active: b.isActive,
    state: b.state,
    destination_lat:    b.destinationLat    ?? null,
    destination_lng:    b.destinationLng    ?? null,
    destination_radius: b.destinationRadius ?? 100,
  };
}

function formatLocation(l) {
  return {
    id: l._id,
    bus_id: l.busId,
    latitude: l.latitude,
    longitude: l.longitude,
    speed: l.speed,
    is_stopped: l.isStopped,
    timestamp: l.timestamp,
  };
}

function formatTrip(t) {
  return {
    id: t._id,
    bus_id: t.busId,
    departure_time: t.departureTime,
    arrival_time: t.arrivalTime,
    is_active: t.isActive,
    created_at: t.createdAt,
  };
}

function formatAttendance(a) {
  return {
    id: a._id,
    student_id: a.studentId,
    bus_id: a.busId,
    status: a.status,
    timestamp: a.timestamp,
  };
}

module.exports = router;
