const API_BASE = import.meta.env.VITE_API_BASE || "http://192.168.29.73:8000";

export const api = {
  // ── Auth ──────────────────────────────────────────
  login: () => `${API_BASE}/auth/login`,
  register: () => `${API_BASE}/auth/register`,
  me: () => `${API_BASE}/auth/me`,
  users: () => `${API_BASE}/auth/users`,
  user: (id) => `${API_BASE}/auth/users/${id}`,
  updateUser: (id) => `${API_BASE}/auth/users/${id}`,

  // ── Students ─────────────────────────────────────
  students: () => `${API_BASE}/students/`,
  student: (id) => `${API_BASE}/students/${id}`,
  studentProfile: (id) => `${API_BASE}/students/profile/${id}`,
  myProfile: () => `${API_BASE}/students/profile`,
  updateStudent: (id) => `${API_BASE}/students/${id}`,

  // ── Face ─────────────────────────────────────────
  faceRegister: () => `${API_BASE}/face/register`,
  faceEncodings: (busId) =>
    busId
      ? `${API_BASE}/face/encodings?busId=${busId}`
      : `${API_BASE}/face/encodings`,
  faceLandmarks: (studentId) => `${API_BASE}/face/landmarks/${studentId}`,
  adminStats: () => `${API_BASE}/face/admin/stats`,

  // ── Buses ────────────────────────────────────────
  buses: () => `${API_BASE}/buses/`,
  bus: (id) => `${API_BASE}/buses/${id}`,
  deleteBus: (id) => `${API_BASE}/buses/${id}`,
  busStatus: (id) => `${API_BASE}/buses/${id}/status`,
  busLocation: (id) => `${API_BASE}/buses/${id}/location`,
  busLocationHistory: (id, start, end) => {
    let url = `${API_BASE}/buses/${id}/location/history`;
    if (start && end)
      url += `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    return url;
  },
  busStudents: (id) => `${API_BASE}/buses/${id}/students`,
  postBusLocation: () => `${API_BASE}/buses/location`,
  updateBusState: (id) => `${API_BASE}/buses/${id}/state`,
  arriveBus: (id) => `${API_BASE}/buses/${id}/arrive`,

  // ── Attendance ───────────────────────────────────
  attendance: () => `${API_BASE}/attendance/`,
  markAttendance: () => `${API_BASE}/attendance/mark`,
  todayAttendance: () => `${API_BASE}/attendance/today`,
  attendanceByDate: (date) => `${API_BASE}/attendance/date/${date}`,
  studentAttendance: (id) => `${API_BASE}/attendance/student/${id}`,
  busAttendance: (id) => `${API_BASE}/attendance/bus/${id}`,

  // ── Notifications ────────────────────────────────
  userNotifications: (userId) => `${API_BASE}/notifications/user/${userId}`,

  // ── Departments ─────────────────────────────────
  departments: () => `${API_BASE}/departments/`,
  department: (id) => `${API_BASE}/departments/${id}`,
};

// ── Helper for fetch calls ──────────────────────────
export async function fetchJson(url, options = {}) {
  const { headers, ...restOptions } = options;
  const res = await fetch(url, {
    ...restOptions,
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
