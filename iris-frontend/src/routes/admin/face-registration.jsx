import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Camera, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
    Loader2, User, Phone, MapPin, BookOpen, Hash, Users, ScanFace, RotateCcw, Send, Bus, Search, X
} from 'lucide-react'
import * as faceapi from 'face-api.js'
import { api, fetchJson } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export const Route = createFileRoute('/admin/face-registration')({
    component: FaceRegistrationPage,
})



const STEPS = [
    { id: 'details', label: 'Student Details', icon: User },
    { id: 'capture', label: 'Face Capture', icon: ScanFace },
    { id: 'review', label: 'Review & Submit', icon: Send },
]

const CAPTURE_ANGLES = [
    { id: 'front', label: 'Front Face', instruction: 'Look straight into the camera' },
    { id: 'left', label: 'Left Profile', instruction: 'Turn your head slightly to the left' },
    { id: 'right', label: 'Right Profile', instruction: 'Turn your head slightly to the right' },
]

function FaceRegistrationPage() {
    const navigate = useNavigate()
    const [activeStep, setActiveStep] = useState(0) // 0, 1, 2

    // ─── Step 1: Student Details ─────────────────────
    const { token } = useAuth()
    const [buses, setBuses] = useState([])
    const [departments, setDepartments] = useState([])
    const [parentUsers, setParentUsers] = useState([])
    const [parentSearch, setParentSearch] = useState('')
    const [showParentDropdown, setShowParentDropdown] = useState(false)
    const parentDropdownRef = useRef(null)
    const [form, setForm] = useState({
        name: '', rollNumber: '', department: '', contact: '',
        address: '', parentId: null, busId: ''
    })
    const [formErrors, setFormErrors] = useState({})

    // Close parent dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target)) {
                setShowParentDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load departments (public, no auth needed)
                const deptData = await fetchJson(api.departments())
                setDepartments(deptData)

                if (token) {
                    const [busData, userData] = await Promise.all([
                        fetchJson(api.buses(), { headers: { Authorization: `Bearer ${token}` } }),
                        fetchJson(api.users(), { headers: { Authorization: `Bearer ${token}` } }),
                    ])
                    setBuses(busData)
                    setParentUsers(userData.filter(u => u.role === 'parent'))
                }
            } catch (err) {
                console.error("Failed to load data for registration form", err)
            }
        }
        loadData()
    }, [token])

    const selectedParent = parentUsers.find(p => p.id === form.parentId)
    const filteredParents = parentUsers.filter(p => {
        const q = parentSearch.toLowerCase()
        if (!q) return true
        return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || String(p.id).includes(q)
    })

    // ─── Step 2: Face Capture ────────────────────────
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [isDetecting, setIsDetecting] = useState(false)
    const [captureIndex, setCaptureIndex] = useState(0) // 0=front, 1=left, 2=right
    const [descriptors, setDescriptors] = useState([null, null, null])
    const [thumbnails, setThumbnails] = useState([null, null, null])
    const [captureError, setCaptureError] = useState(null)

    // ─── Step 3: Submit ──────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitResult, setSubmitResult] = useState(null)


    // ═══════════════════════════════════════════════════
    //  FORM LOGIC
    // ═══════════════════════════════════════════════════
    const handleFormChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }))
        if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: null }))
    }

    const validateForm = () => {
        const errors = {}
        if (!form.name.trim()) errors.name = 'Name is required'
        if (!form.rollNumber.trim()) errors.rollNumber = 'Roll number is required'
        if (!form.contact.trim()) errors.contact = 'Contact number is required'
        if (!form.parentId) errors.parentId = 'Parent / Guardian is required'
        if (!form.busId) errors.busId = 'Bus assignment is required'
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleNextFromDetails = () => {
        if (validateForm()) setActiveStep(1)
    }


    // ═══════════════════════════════════════════════════
    //  CAMERA & FACE-API LOGIC
    // ═══════════════════════════════════════════════════
    const stopCamera = useCallback(() => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    try { track.stop() } catch (e) { /* ignore */ }
                })
                streamRef.current = null
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        } catch (e) {
            console.warn('Error stopping camera:', e)
        }
    }, [])

    const startCamera = useCallback(async () => {
        // Always release existing streams first
        stopCamera()
        // Give the hardware driver time to fully release
        await new Promise(r => setTimeout(r, 500))

        const MAX_RETRIES = 3
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`Camera retry attempt ${attempt}/${MAX_RETRIES}...`)
                    await new Promise(r => setTimeout(r, 1500 * attempt))
                }
                // Use the simplest possible constraint — no facingMode
                // facingMode: 'user' can cause NotReadableError on some Windows webcams
                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    setCaptureError(null)
                }
                console.log('Camera started successfully on attempt', attempt)
                return // success!
            } catch (err) {
                console.warn(`Camera attempt ${attempt}/${MAX_RETRIES} failed:`, err.name, err.message)
                if (attempt === MAX_RETRIES) {
                    console.error('Camera error (all retries exhausted):', err)
                    setCaptureError(
                        'Could not start camera after multiple attempts. Please:\n' +
                        '1. Close ALL other browser tabs\n' +
                        '2. Close any video apps (Zoom, Teams, etc.)\n' +
                        '3. Check Windows Settings → Privacy → Camera\n' +
                        '4. Refresh this page'
                    )
                }
            }
        }
    }, [stopCamera])

    // Load models when entering step 2
    useEffect(() => {
        if (activeStep !== 1) return
        let cancelled = false

        const init = async () => {
            if (!modelsLoaded) {
                try {
                    await Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                    ])
                    if (!cancelled) setModelsLoaded(true)
                } catch (err) {
                    console.error('Model load error:', err)
                    setCaptureError('Failed to load AI models.')
                    return
                }
            }
            if (!cancelled) {
                await startCamera()
            }
        }

        init()
        return () => {
            cancelled = true
            stopCamera()
        }
    }, [activeStep])


    const captureCurrentAngle = async () => {
        if (!videoRef.current || !modelsLoaded) return
        setIsDetecting(true)
        setCaptureError(null)

        try {
            const detection = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
            ).withFaceLandmarks().withFaceDescriptor()

            if (detection) {
                // Save descriptor
                const newDescriptors = [...descriptors]
                newDescriptors[captureIndex] = Array.from(detection.descriptor)
                setDescriptors(newDescriptors)

                // Generate thumbnail from video
                const canvas = document.createElement('canvas')
                canvas.width = videoRef.current.videoWidth
                canvas.height = videoRef.current.videoHeight
                canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
                const newThumbnails = [...thumbnails]
                newThumbnails[captureIndex] = canvas.toDataURL('image/jpeg', 0.7)
                setThumbnails(newThumbnails)

                // Auto-advance
                if (captureIndex < 2) {
                    setCaptureIndex(captureIndex + 1)
                }
            } else {
                setCaptureError('No face detected. Ensure your face is clearly visible and well-lit.')
            }
        } catch (err) {
            console.error('Capture error:', err)
            setCaptureError('An error occurred during facial analysis.')
        } finally {
            setIsDetecting(false)
        }
    }

    const recaptureAngle = (index) => {
        setCaptureIndex(index)
        const newDesc = [...descriptors]; newDesc[index] = null; setDescriptors(newDesc)
        const newThumb = [...thumbnails]; newThumb[index] = null; setThumbnails(newThumb)
        setCaptureError(null)
    }

    const allCaptured = descriptors.every(d => d !== null)

    const handleNextFromCapture = () => {
        if (allCaptured) {
            stopCamera()
            setActiveStep(2)
        }
    }


    // ═══════════════════════════════════════════════════
    //  SUBMIT LOGIC
    // ═══════════════════════════════════════════════════
    const handleSubmit = async () => {
        setIsSubmitting(true)
        setSubmitResult(null)

        try {
            const body = {
                name: form.name,
                roll_number: form.rollNumber,
                department: form.department,
                contact: form.contact,
                address: form.address,
                parent_name: selectedParent?.full_name || '',
                parent_contact: '',
                parent_id: form.parentId,
                bus_id: form.busId || null,
                descriptors: descriptors,
            }

            const res = await fetch(api.faceRegister(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || `Server error ${res.status}`)
            }

            const data = await res.json()
            setSubmitResult({ success: true, data })

            setTimeout(() => navigate({ to: '/' }), 3000)
        } catch (err) {
            console.error('Submit error:', err)
            setSubmitResult({ success: false, error: err.message })
        } finally {
            setIsSubmitting(false)
        }
    }


    // ═══════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="w-full max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => activeStep > 0 ? setActiveStep(activeStep - 1) : navigate({ to: '/' })}
                        className="p-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft size={22} className="text-neutral-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                            Student Registration
                        </h1>
                        <p className="text-neutral-500 text-sm mt-0.5">Register face & profile for biometric identification</p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 mb-10 px-2">
                    {STEPS.map((step, i) => {
                        const Icon = step.icon
                        const isActive = i === activeStep
                        const isCompleted = i < activeStep
                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-300 w-full
                                    ${isActive ? 'bg-teal-500/10 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.1)]' :
                                        isCompleted ? 'bg-emerald-500/10 border-emerald-500/20' :
                                            'bg-neutral-900/50 border-neutral-800'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
                                        ${isActive ? 'bg-teal-500/20 text-teal-400' :
                                            isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
                                                'bg-neutral-800 text-neutral-500'}`}
                                    >
                                        {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                                    </div>
                                    <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-teal-400' : isCompleted ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`h-px flex-1 mx-2 transition-colors ${i < activeStep ? 'bg-emerald-500/40' : 'bg-neutral-800'}`}></div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* ─── STEP 1: STUDENT DETAILS ─────────────── */}
                {activeStep === 0 && (
                    <div className="animate-in fade-in duration-300">
                        <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <User size={20} className="text-teal-400" /> Student Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <FormInput icon={<User size={16} />} label="Full Name *" placeholder="e.g. John Doe" value={form.name} onChange={handleFormChange('name')} error={formErrors.name} />
                                <FormInput icon={<Hash size={16} />} label="Roll Number *" placeholder="e.g. 21CS001" value={form.rollNumber} onChange={handleFormChange('rollNumber')} error={formErrors.rollNumber} />
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Department</label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-3.5 text-neutral-500"><BookOpen size={16} /></div>
                                        <select
                                            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3 pl-10 text-white outline-none transition-all text-sm appearance-none focus:border-teal-500/50"
                                            value={form.department}
                                            onChange={handleFormChange('department')}
                                        >
                                            <option value="">— Select department —</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}{d.full_name ? ` - ${d.full_name}` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <FormInput icon={<Phone size={16} />} label="Contact Number *" placeholder="e.g. +91 9876543210" value={form.contact} onChange={handleFormChange('contact')} error={formErrors.contact} />
                                <div className="md:col-span-2">
                                    <FormInput icon={<MapPin size={16} />} label="Address" placeholder="Full address" value={form.address} onChange={handleFormChange('address')} textarea />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Assign Bus <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-3.5 text-neutral-500"><Bus size={16} /></div>
                                        <select
                                            className={`w-full bg-neutral-900/80 border rounded-xl px-4 py-3 pl-10 text-white outline-none transition-all text-sm appearance-none ${formErrors.busId ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500/50'}`}
                                            value={form.busId}
                                            onChange={handleFormChange('busId')}
                                        >
                                            <option value="">— Select a bus —</option>
                                            {buses.map(bus => (
                                                <option key={bus.id} value={bus.id}>{bus.bus_number} - {bus.route_name || "No Route"}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {formErrors.busId && <p className="text-xs text-red-400 mt-1">{formErrors.busId}</p>}
                                </div>
                            </div>

                            <div className="h-px bg-neutral-800 my-6"></div>

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Users size={20} className="text-teal-400" /> Parent / Guardian <span className="text-red-400">*</span>
                            </h2>

                            {/* Selected parent chip */}
                            {selectedParent ? (
                                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                        <User size={18} className="text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-emerald-300 truncate">{selectedParent.full_name || 'Unnamed'}</p>
                                        <p className="text-xs text-neutral-400 truncate">{selectedParent.email} · ID #{selectedParent.id}</p>
                                    </div>
                                    <button
                                        onClick={() => { setForm(prev => ({ ...prev, parentId: null })); setParentSearch('') }}
                                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                        title="Remove parent"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative" ref={parentDropdownRef}>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-3.5 text-neutral-500"><Search size={16} /></div>
                                        <input
                                            type="text"
                                            className={`w-full bg-neutral-900/80 border rounded-xl px-4 py-3 pl-10 text-white placeholder-neutral-600 outline-none transition-all text-sm ${formErrors.parentId ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500/50 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]'}`}
                                            placeholder="Search parent by name, email, or ID..."
                                            value={parentSearch}
                                            onChange={(e) => { setParentSearch(e.target.value); setShowParentDropdown(true) }}
                                            onFocus={() => setShowParentDropdown(true)}
                                        />
                                    </div>
                                    {formErrors.parentId && <p className="text-xs text-red-400 mt-1">{formErrors.parentId}</p>}

                                    {showParentDropdown && (
                                        <div className="absolute z-50 mt-1.5 w-full bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                                            {filteredParents.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-neutral-500">No parents found</div>
                                            ) : (
                                                filteredParents.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            setForm(prev => ({ ...prev, parentId: p.id }))
                                                            setParentSearch('')
                                                            setShowParentDropdown(false)
                                                            if (formErrors.parentId) setFormErrors(prev => ({ ...prev, parentId: null }))
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/80 transition-colors text-left cursor-pointer border-b border-neutral-800/50 last:border-b-0"
                                                    >
                                                        <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                                                            <User size={16} className="text-teal-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{p.full_name || 'Unnamed'}</p>
                                                            <p className="text-xs text-neutral-500 truncate">{p.email} · ID #{p.id}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end mt-8">
                                <button
                                    onClick={handleNextFromDetails}
                                    className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
                                >
                                    Continue to Face Capture <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── STEP 2: FACE CAPTURE ─────────────────── */}
                {activeStep === 1 && (
                    <div className="animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Camera */}
                            <div className="lg:col-span-2 relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay playsInline muted
                                    onLoadedMetadata={(e) => e.target.play()}
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${!modelsLoaded ? 'opacity-0' : 'opacity-100'}`}
                                    style={{ transform: 'scaleX(-1)' }}
                                />

                                {!modelsLoaded && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                                        <Loader2 size={48} className="text-teal-500 animate-spin mb-4" />
                                        <p className="text-neutral-300 font-medium animate-pulse">Loading AI Models...</p>
                                    </div>
                                )}

                                {modelsLoaded && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Corner brackets */}
                                        <div className="absolute inset-6 border-2 border-dashed border-white/10 rounded-2xl">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-teal-500 rounded-tl-lg -translate-x-0.5 -translate-y-0.5"></div>
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-teal-500 rounded-tr-lg translate-x-0.5 -translate-y-0.5"></div>
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-teal-500 rounded-bl-lg -translate-x-0.5 translate-y-0.5"></div>
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-teal-500 rounded-br-lg translate-x-0.5 translate-y-0.5"></div>
                                        </div>
                                        {/* current instruction */}
                                        <div className="absolute bottom-4 left-0 right-0 text-center">
                                            <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-neutral-700 px-4 py-2 rounded-full">
                                                {isDetecting ? <Loader2 size={14} className="animate-spin text-teal-400" /> : <Camera size={14} className="text-neutral-400" />}
                                                <span className="text-sm font-medium">{CAPTURE_ANGLES[captureIndex]?.instruction || 'All captured!'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="flex flex-col gap-5">

                                {/* Progress */}
                                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                                    <h2 className="text-lg font-bold text-white mb-5">Capture Progress</h2>
                                    <div className="space-y-4">
                                        {CAPTURE_ANGLES.map((angle, i) => {
                                            const captured = descriptors[i] !== null
                                            const isActive = captureIndex === i && !captured
                                            return (
                                                <div key={angle.id} className="flex items-center gap-3">
                                                    {/* Thumbnail or placeholder */}
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border overflow-hidden shrink-0 transition-all
                                                        ${captured ? 'border-emerald-500/30' :
                                                            isActive ? 'border-teal-500/40 animate-pulse' :
                                                                'border-neutral-800 bg-neutral-900'}`}
                                                    >
                                                        {thumbnails[i] ? (
                                                            <img src={thumbnails[i]} alt={angle.label} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                                                        ) : (
                                                            <Camera size={16} className={isActive ? 'text-teal-400' : 'text-neutral-600'} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium ${captured ? 'text-emerald-400' : isActive ? 'text-white' : 'text-neutral-500'}`}>
                                                            {angle.label}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 truncate">
                                                            {captured ? 'Captured ✓' : isActive ? 'Ready to capture' : 'Pending'}
                                                        </p>
                                                    </div>
                                                    {captured && (
                                                        <button
                                                            onClick={() => recaptureAngle(i)}
                                                            className="p-1.5 text-neutral-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all cursor-pointer"
                                                            title="Recapture"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Error / Status */}
                                {captureError && (
                                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-red-300">{captureError}</p>
                                    </div>
                                )}

                                {/* Capture button */}
                                <button
                                    onClick={captureCurrentAngle}
                                    disabled={isDetecting || allCaptured || !modelsLoaded}
                                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer
                                        ${isDetecting || allCaptured || !modelsLoaded
                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-70'
                                            : 'bg-linear-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90 active:scale-95 shadow-teal-500/20'
                                        }`}
                                >
                                    {isDetecting ? (
                                        <><Loader2 size={20} className="animate-spin" /> Analyzing...</>
                                    ) : allCaptured ? (
                                        <><CheckCircle2 size={20} /> All Captured</>
                                    ) : (
                                        <><Camera size={20} /> Capture {CAPTURE_ANGLES[captureIndex]?.label}</>
                                    )}
                                </button>

                                {/* Navigate next */}
                                {allCaptured && (
                                    <button
                                        onClick={handleNextFromCapture}
                                        className="w-full py-3.5 rounded-xl font-bold text-base bg-linear-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                                    >
                                        Review & Submit <ArrowRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── STEP 3: REVIEW & SUBMIT ──────────────── */}
                {activeStep === 2 && (
                    <div className="animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Details summary */}
                            <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <User size={20} className="text-teal-400" /> Profile Summary
                                </h2>
                                <div className="space-y-4">
                                    <SummaryRow label="Full Name" value={form.name} />
                                    <SummaryRow label="Roll Number" value={form.rollNumber} />
                                    <SummaryRow label="Department" value={form.department || '—'} />
                                    <SummaryRow label="Contact" value={form.contact} />
                                    <SummaryRow label="Address" value={form.address || '—'} />
                                    <div className="h-px bg-neutral-800 my-2"></div>
                                    <SummaryRow label="Parent / Guardian" value={selectedParent ? `${selectedParent.full_name || 'Unnamed'} (${selectedParent.email})` : '—'} />
                                    <SummaryRow label="Assigned Bus" value={buses.find(b => String(b.id) === String(form.busId))?.bus_number || '—'} />
                                </div>
                            </div>

                            {/* Face thumbnails + submit */}
                            <div className="flex flex-col gap-6">
                                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <ScanFace size={20} className="text-teal-400" /> Face Captures
                                    </h2>
                                    <div className="grid grid-cols-3 gap-3">
                                        {CAPTURE_ANGLES.map((angle, i) => (
                                            <div key={angle.id} className="flex flex-col items-center gap-2">
                                                <div className="aspect-square w-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                                                    {thumbnails[i] && (
                                                        <img src={thumbnails[i]} alt={angle.label} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                                                    )}
                                                </div>
                                                <span className="text-xs text-neutral-400 font-medium">{angle.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Submit result */}
                                {submitResult && (
                                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${submitResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        {submitResult.success ? (
                                            <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 shrink-0" />
                                        ) : (
                                            <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${submitResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                                {submitResult.success ? 'Registration Successful!' : 'Registration Failed'}
                                            </p>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {submitResult.success
                                                    ? `Student ID: ${submitResult.data.student_id} — Redirecting...`
                                                    : submitResult.error
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || submitResult?.success}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer
                                        ${isSubmitting || submitResult?.success
                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-70'
                                            : 'bg-linear-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90 active:scale-95 shadow-teal-500/20 hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={22} className="animate-spin" /> Registering...</>
                                    ) : submitResult?.success ? (
                                        <><CheckCircle2 size={22} /> Done!</>
                                    ) : (
                                        <><Send size={20} /> Register Student</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


// ═══════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function FormInput({ icon, label, placeholder, value, onChange, error, textarea }) {
    const inputClasses = `w-full bg-neutral-900/80 border rounded-xl px-4 py-3 pl-10 text-white placeholder-neutral-600 outline-none transition-all text-sm
        ${error ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500/50 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)]'}`

    return (
        <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute left-3.5 top-3.5 text-neutral-500">{icon}</div>
                {textarea ? (
                    <textarea
                        className={inputClasses + ' min-h-20 resize-none'}
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        rows={3}
                    />
                ) : (
                    <input
                        type="text"
                        className={inputClasses}
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                    />
                )}
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    )
}

function SummaryRow({ label, value }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">{label}</span>
            <span className="text-sm text-white font-medium text-right max-w-[60%] truncate">{value}</span>
        </div>
    )
}
