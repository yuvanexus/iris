import { createFileRoute } from '@tanstack/react-router'
import { ScanFace, WifiOff, Wifi } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

import { useScannerAudio } from '../../hooks/useScannerAudio'
import { NotificationToast } from '../../components/scanner/NotificationToast'
import { ScanningAnimation } from '../../components/scanner/ScanningAnimation'
import { ScannerHeader } from '../../components/scanner/ScannerHeader'

export const Route = createFileRoute('/scanner/')({
    component: Index,
})

// ── Offline Queue Helpers ────────────────────────────
// Saves attendance marks to localStorage when offline, syncs when back online
const QUEUE_KEY = 'iris_offline_attendance_queue'
const FACE_CACHE_KEY = 'iris_face_encodings_cache'

function getOfflineQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch { return [] }
}

function addToOfflineQueue(entry) {
    const queue = getOfflineQueue()
    queue.push({ ...entry, queuedAt: new Date().toISOString() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function clearOfflineQueue() {
    localStorage.removeItem(QUEUE_KEY)
}

// ── Face Data Cache Helpers ──────────────────────────
function cacheFaceData(data) {
    try {
        localStorage.setItem(FACE_CACHE_KEY, JSON.stringify(data))
    } catch (e) {
        console.warn('Failed to cache face data (storage full?):', e)
    }
}

function getCachedFaceData() {
    try {
        return JSON.parse(localStorage.getItem(FACE_CACHE_KEY) || 'null')
    } catch { return null }
}

function Index() {
    const { token, user } = useAuth()
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const intervalRef = useRef(null)
    const detectedNamesRef = useRef(new Map())  // track per-person cooldowns
    const matcherRef = useRef(null)             // FaceMatcher instance
    const studentMapRef = useRef(new Map())     // label → student info

    // Bus this scanner is assigned to — sourced from the user's account profile (set by admin)
    // Falls back to localStorage only as a legacy migration shim
    const busId = user?.bus_id || localStorage.getItem('scanner_bus_id') || null

    const [cameraActive, setCameraActive] = useState(false)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [notification, setNotification] = useState(null)
    const [facingMode, setFacingMode] = useState('user')
    const [registeredCount, setRegisteredCount] = useState(0)
    const [busState, setBusState] = useState('stopped')
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [queueCount, setQueueCount] = useState(getOfflineQueue().length)

    const { playMelody, playGreeting } = useScannerAudio()

    // ─── Online/Offline detection ─────────────────────
    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // ─── Sync offline queue when back online ──────────
    useEffect(() => {
        if (!isOnline || !token) return

        const syncQueue = async () => {
            const queue = getOfflineQueue()
            if (queue.length === 0) return
            console.log(`Syncing ${queue.length} offline attendance records...`)

            const failed = []
            for (const entry of queue) {
                try {
                    await fetch(api.markAttendance(), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify(entry),
                    })
                } catch (err) {
                    console.error('Sync failed for entry:', err)
                    failed.push(entry)
                }
            }

            if (failed.length > 0) {
                localStorage.setItem(QUEUE_KEY, JSON.stringify(failed))
            } else {
                clearOfflineQueue()
            }
            setQueueCount(failed.length)
            console.log(`Sync complete. ${failed.length} remaining.`)
        }

        syncQueue()
    }, [isOnline, token])

    // ─── Load AI models ──────────────────────────────
    useEffect(() => {
        let cancelled = false
        const loadModels = async () => {
            const MODEL_URL = '/models'
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])
                if (!cancelled) setModelsLoaded(true)
            } catch (err) {
                console.error("Failed to load face-api models", err)
            }
        }
        loadModels()
        return () => { cancelled = true }
    }, [])

    // ─── GPS Tracking with auto bus state detection ──
    useEffect(() => {
        if (!busId) return
        const gpsEnabled = localStorage.getItem('gpsEnabled') !== 'false'
        if (!gpsEnabled) return
        if (!navigator.geolocation) return

        let lastSend = 0
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now()
                if (now - lastSend < 10000) return  // refresh every 10s
                lastSend = now

                const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0 // m/s -> km/h

                // Auto-detect bus state from GPS speed
                const autoState = speed < 5 ? 'stopped' : 'on_the_way'
                setBusState(prev => prev === 'arrived' ? 'arrived' : autoState)

                // Only send to backend if online
                if (navigator.onLine) {
                    fetch(api.postBusLocation(), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({
                            bus_id: busId,
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            speed,
                            is_stopped: speed < 5,
                        }),
                    })
                    .then(r => r.json())
                    .then(data => {
                        // If the server detected geofence arrival, update UI
                        if (data.auto_arrived) {
                            setBusState('arrived')
                            setNotification({
                                name: '🏫 Bus Arrived at Destination',
                                role: 'All on-board students have been auto-exited',
                                time: 'Geofence triggered',
                                location: '',
                                status: 'success',
                            })
                            setTimeout(() => setNotification(null), 6000)
                        }
                    })
                    .catch(err => console.error('GPS post error:', err))
                }
            },
            (err) => console.warn('GPS error:', err.message),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        )

        return () => navigator.geolocation.clearWatch(watchId)
    }, [busId, token])

    // ─── Fetch face encodings (with offline cache fallback) ──
    useEffect(() => {
        if (!modelsLoaded) return
        let cancelled = false

        const buildMatcher = (data) => {
            if (!data || !data.length) {
                setRegisteredCount(0)
                return
            }

            const labeledDescriptors = []
            data.forEach(entry => {
                const label = `${entry.name} (${entry.roll_number})`
                const validDescs = (entry.descriptors || [])
                    .filter(d => Array.isArray(d) && d.length === 128)
                    .map(d => new Float32Array(d))

                if (validDescs.length === 0) return

                studentMapRef.current.set(label, {
                    name: entry.name,
                    rollNumber: entry.roll_number,
                    department: entry.department,
                    studentId: entry.student_id,
                })

                labeledDescriptors.push(
                    new faceapi.LabeledFaceDescriptors(label, validDescs)
                )
            })

            if (labeledDescriptors.length === 0) {
                setRegisteredCount(data.length)
                return
            }

            matcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6)
            setRegisteredCount(data.length)
            console.log(`FaceMatcher ready with ${labeledDescriptors.length} faces`)
        }

        const loadEncodings = async () => {
            if (navigator.onLine) {
                // Online: fetch from API and cache for offline use
                try {
                    const res = await fetch(api.faceEncodings(busId), {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    })
                    if (!res.ok) throw new Error('Failed to fetch encodings')
                    const data = await res.json()
                    if (cancelled) return

                    cacheFaceData(data) // Save to localStorage for offline use
                    buildMatcher(data)
                    console.log('Face data loaded from API and cached for offline use')
                } catch (err) {
                    console.error('Error loading face encodings:', err)
                    // Fallback to cache on network error
                    const cached = getCachedFaceData()
                    if (cached) {
                        buildMatcher(cached)
                        console.log('Using cached face data (network error)')
                    }
                }
            } else {
                // Offline: use cached data
                const cached = getCachedFaceData()
                if (cached) {
                    buildMatcher(cached)
                    console.log('Offline mode: using cached face data')
                } else {
                    console.warn('Offline and no cached face data available')
                }
            }
        }

        loadEncodings()
        return () => { cancelled = true }
    }, [modelsLoaded])

    // ─── Setup camera ────────────────────────────────
    useEffect(() => {
        if (!modelsLoaded) return
        let streamObj = null
        let cancelled = false
        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } })
                if (cancelled) {
                    stream.getTracks().forEach(track => track.stop())
                    return
                }
                streamObj = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setCameraActive(true)
                }
            } catch (err) {
                console.error("Error accessing camera:", err)
            }
        }
        setupCamera()

        return () => {
            cancelled = true
            if (streamObj) {
                streamObj.getTracks().forEach(track => track.stop())
            }
        }
    }, [modelsLoaded, facingMode])

    const triggerDetection = useCallback((detectedName, studentInfo) => {
        if (studentInfo?.studentId && busId) {
            const attendancePayload = {
                student_id: studentInfo.studentId,
                bus_id: busId,
                status: 'present_in_bus',
                bus_state: busState,
            }

            if (!navigator.onLine) {
                // OFFLINE: queue for later sync
                addToOfflineQueue(attendancePayload)
                setQueueCount(getOfflineQueue().length)
                playMelody()
                playGreeting(detectedName)
                setNotification({
                    name: detectedName,
                    role: studentInfo?.department || "Student",
                    time: "Saved offline",
                    location: studentInfo?.rollNumber || "",
                    status: "info"
                })
                setTimeout(() => setNotification(null), 4000)
                return
            }

            // ONLINE: send immediately
            fetch(api.markAttendance(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(attendancePayload),
            })
                .then(res => res.json())
                .then(data => {
                    const isExited = data.status === 'exited_from_bus'
                    const isFirst = !data.already_marked

                    if (isFirst) {
                        playMelody()
                        playGreeting(detectedName)
                    } else {
                        playMelody()
                    }

                    setNotification({
                        name: detectedName,
                        role: studentInfo?.department || "Student",
                        time: isExited ? "Exited Bus" : isFirst ? "Entered Bus" : "Already on board",
                        location: studentInfo?.rollNumber || "",
                        status: isExited ? "info" : "success"
                    })
                    setTimeout(() => setNotification(null), 4000)
                })
                .catch(err => {
                    // Network error — queue offline
                    console.error('Failed to mark attendance, queuing offline:', err)
                    addToOfflineQueue(attendancePayload)
                    setQueueCount(getOfflineQueue().length)
                    playMelody()
                    setNotification({
                        name: detectedName,
                        role: studentInfo?.department || "Student",
                        time: "Saved offline",
                        location: studentInfo?.rollNumber || "",
                        status: "info"
                    })
                    setTimeout(() => setNotification(null), 4000)
                })
        } else {
            playMelody()
            playGreeting(detectedName)
            setNotification({
                name: detectedName,
                role: studentInfo?.department || "Student",
                time: "Just now",
                location: studentInfo?.rollNumber || "",
                status: "success"
            })
            setTimeout(() => setNotification(null), 4000)
        }
    }, [playMelody, playGreeting, busId, token, busState])

    const handleSimulation = useCallback(() => {
        triggerDetection("Simulation Test", { department: "Demo", rollNumber: "SIM-001" })
    }, [triggerDetection])

    // ─── AI Face Detection & Recognition loop ────────
    useEffect(() => {
        if (!cameraActive || !modelsLoaded) return

        const runDetection = async () => {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas) return
            if (video.paused || video.ended || !video.videoWidth) return

            const vw = video.videoWidth
            const vh = video.videoHeight

            if (canvas.width !== vw) canvas.width = vw
            if (canvas.height !== vh) canvas.height = vh

            try {
                const detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors()

                const displaySize = { width: vw, height: vh }
                const resized = faceapi.resizeResults(detections, displaySize)

                const ctx = canvas.getContext('2d')
                ctx.clearRect(0, 0, vw, vh)

                const isMirrored = facingMode === 'user'

                resized.forEach(detection => {
                    let { x, y, width, height } = detection.detection.box
                    if (isMirrored) {
                        x = vw - x - width
                    }

                    let matchLabel = 'Unknown'
                    let matchDistance = 1.0
                    let studentInfo = null

                    if (matcherRef.current) {
                        const bestMatch = matcherRef.current.findBestMatch(detection.descriptor)
                        matchLabel = bestMatch.label
                        matchDistance = bestMatch.distance

                        if (matchLabel !== 'unknown') {
                            studentInfo = studentMapRef.current.get(matchLabel)
                        } else {
                            matchLabel = 'Unknown'
                        }
                    }

                    const isKnown = matchLabel !== 'Unknown'
                    const color = isKnown ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.7)'
                    const fillColor = isKnown ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.04)'

                    ctx.strokeStyle = color
                    ctx.lineWidth = 2

                    // Corner brackets
                    const cornerLen = 20
                    ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo(x + width - cornerLen, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerLen); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo(x, y + height - cornerLen); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerLen, y + height); ctx.stroke()
                    ctx.beginPath(); ctx.moveTo(x + width - cornerLen, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - cornerLen); ctx.stroke()

                    ctx.fillStyle = fillColor
                    ctx.fillRect(x, y, width, height)

                    const displayName = isKnown ? (studentInfo?.name || matchLabel) : 'Unknown'
                    const confidence = isKnown ? `${Math.round((1 - matchDistance) * 100)}%` : ''
                    const labelText = confidence ? `${displayName} · ${confidence}` : displayName

                    ctx.font = 'bold 14px Inter, sans-serif'
                    const textWidth = ctx.measureText(labelText).width
                    const labelPadding = 8
                    const labelHeight = 26
                    const labelY = y - labelHeight - 4

                    ctx.fillStyle = isKnown ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.75)'
                    ctx.beginPath()
                    const lw = textWidth + labelPadding * 2
                    if (ctx.roundRect) {
                        ctx.roundRect(x, labelY, lw, labelHeight, 6)
                    } else {
                        ctx.rect(x, labelY, lw, labelHeight)
                    }
                    ctx.fill()

                    ctx.fillStyle = '#ffffff'
                    ctx.fillText(labelText, x + labelPadding, labelY + 18)

                    if (isKnown && detection.detection.score > 0.7) {
                        const now = Date.now()
                        const lastSeen = detectedNamesRef.current.get(matchLabel) || 0
                        if (now - lastSeen > 8000) {
                            detectedNamesRef.current.set(matchLabel, now)
                            triggerDetection(studentInfo?.name || matchLabel, studentInfo)
                        }
                    }
                })
            } catch (e) {
                // Detection frame error, ignore
            }
        }

        intervalRef.current = setInterval(runDetection, 300)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [cameraActive, modelsLoaded, triggerDetection, facingMode])

    const isReady = cameraActive && modelsLoaded

    // ─── Blockade: no bus assigned ────────────────────
    if (!busId) {
        return (
            <div className="fixed inset-0 w-screen h-screen bg-black flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
                    <ScanFace size={40} className="text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">No Bus Assigned</h1>
                <p className="text-neutral-400 max-w-sm mb-2">
                    This scanner account has not been assigned to a bus yet.
                </p>
                <p className="text-neutral-500 text-sm max-w-sm">
                    Please contact your administrator to assign a bus to this scanner account from the <span className="text-teal-400 font-medium">Admin → Users</span> panel.
                </p>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black font-sans">
            {/* Camera Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover z-1 opacity-80"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* Canvas overlay for AI face boxes + labels */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover z-2 pointer-events-none"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/60 z-3 pointer-events-none"></div>

            {/* Loading Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center flex-col text-neutral-500 gap-4 z-4 transition-opacity duration-500 ${!isReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <ScanFace size={64} className="opacity-50 animate-pulse" />
                <p className="font-medium tracking-wide">{!modelsLoaded ? "Loading AI Models..." : "Initializing Camera Feed..."}</p>
            </div>

            <ScannerHeader
                isReady={isReady}
                triggerSimulation={handleSimulation}
                facingMode={facingMode}
                toggleFacingMode={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                busId={busId}
                busState={busState}
                onBusStateChange={setBusState}
                token={token}
            />

            <ScanningAnimation isReady={isReady} notification={notification} />

            {/* Status indicators */}
            {isReady && (
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
                    {/* Online/Offline indicator */}
                    <div className={`bg-black/60 backdrop-blur-md border rounded-full px-4 py-2 flex items-center gap-2 ${isOnline ? 'border-neutral-700/50' : 'border-amber-500/50'}`}>
                        {isOnline ? (
                            <Wifi size={14} className="text-emerald-400" />
                        ) : (
                            <WifiOff size={14} className="text-amber-400" />
                        )}
                        <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isOnline ? 'Online' : 'Offline — scans saved locally'}
                        </span>
                        {queueCount > 0 && (
                            <span className="text-xs text-amber-400 ml-1">({queueCount} queued)</span>
                        )}
                    </div>
                    <div className="bg-black/60 backdrop-blur-md border border-neutral-700/50 rounded-full px-4 py-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${registeredCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'}`}></div>
                        <span className="text-xs text-neutral-300 font-medium">
                            {registeredCount > 0 ? `${registeredCount} face${registeredCount > 1 ? 's' : ''} registered` : 'No faces registered'}
                        </span>
                    </div>
                    {/* Bus assignment indicator */}
                    <div className={`bg-black/60 backdrop-blur-md border rounded-full px-4 py-2 flex items-center gap-2 ${busId ? 'border-neutral-700/50' : 'border-amber-500/50'}`}>
                        <div className={`w-2 h-2 rounded-full ${busId ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'}`}></div>
                        <span className="text-xs text-neutral-300 font-medium">
                            Bus #{busId} assigned
                        </span>
                    </div>
                </div>
            )}

            <NotificationToast notification={notification} />
        </div>
    )
}
