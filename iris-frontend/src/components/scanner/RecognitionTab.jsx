import { useState, useEffect } from 'react'
import { Cpu, Music } from 'lucide-react'
import { SettingToggle } from './SettingToggle'

export function RecognitionTab() {
    const [melody, setMelody] = useState('tech')
    const [voices, setVoices] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('')
    const [ttsRate, setTtsRate] = useState(1.0)
    const [ttsPitch, setTtsPitch] = useState(1.1)

    useEffect(() => {
        setMelody(localStorage.getItem('scannerMelody') || 'tech')
        setSelectedVoice(localStorage.getItem('ttsVoice') || '')
        setTtsRate(parseFloat(localStorage.getItem('ttsRate') || '1.0'))
        setTtsPitch(parseFloat(localStorage.getItem('ttsPitch') || '1.1'))

        const loadVoices = () => {
            const v = window.speechSynthesis.getVoices()
            if (v.length > 0) setVoices(v)
        }
        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices
    }, [])

    const handleMelodyChange = (newMelody) => {
        setMelody(newMelody)
        localStorage.setItem('scannerMelody', newMelody)

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const playNote = (freq, startTime, duration) => {
                const oscillator = audioCtx.createOscillator()
                const gainNode = audioCtx.createGain()
                oscillator.type = 'sine'
                oscillator.frequency.setValueAtTime(freq, startTime)
                gainNode.gain.setValueAtTime(0, startTime)
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
                oscillator.connect(gainNode)
                gainNode.connect(audioCtx.destination)
                oscillator.start(startTime)
                oscillator.stop(startTime + duration)
            }
            const now = audioCtx.currentTime
            if (newMelody === 'tech') {
                playNote(1046.50, now, 0.15); playNote(1318.51, now + 0.1, 0.15); playNote(1567.98, now + 0.2, 0.15); playNote(2093.00, now + 0.3, 0.4)
            } else if (newMelody === 'chime') {
                playNote(1046.50, now, 0.4); playNote(2093.00, now + 0.2, 0.6)
            } else {
                playNote(800, now, 0.8)
            }
        } catch (e) { }
    }

    return (
        <section className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Cpu className="text-teal-400" />
                Recognition Engine
            </h2>
            <div className="space-y-6">
                <SettingToggle
                    title="Strict Face Matching"
                    description="Requires 98%+ confidence for automated entry approval."
                    enabled={true}
                />
                <div className="h-px w-full bg-neutral-800/60"></div>
                <SettingToggle
                    title="GPS Tracking"
                    description="Track and record the bus location using the device's GPS sensor."
                    enabled={false}
                />
                <div className="h-px w-full bg-neutral-800/60"></div>
                <SettingToggle
                    title="TTS Voice Greeting"
                    description='Play an AI-generated voice greeting ("Welcome [Name]") upon successful face match.'
                    enabled={true}
                    storageKey="ttsEnabled"
                />
                <div className="h-px w-full bg-neutral-800/60"></div>

                {/* Voice Selector */}
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                        <div>
                            <h4 className="text-white font-medium group-hover:text-teal-400 transition-colors flex items-center gap-2">
                                <Music size={16} /> TTS Voice
                            </h4>
                            <p className="text-sm text-neutral-400 mt-0.5">Choose which voice reads the greeting aloud.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedVoice}
                                onChange={(e) => {
                                    setSelectedVoice(e.target.value)
                                    localStorage.setItem('ttsVoice', e.target.value)
                                }}
                                className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none w-full sm:w-auto min-w-48 cursor-pointer"
                            >
                                <option value="">System Default</option>
                                {voices.map((v, i) => (
                                    <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    window.speechSynthesis.cancel()
                                    const u = new SpeechSynthesisUtterance('Welcome, Test User')
                                    if (selectedVoice) {
                                        const v = voices.find(v => v.name === selectedVoice)
                                        if (v) u.voice = v
                                    }
                                    u.rate = ttsRate
                                    u.pitch = ttsPitch
                                    window.speechSynthesis.speak(u)
                                }}
                                className="cursor-pointer shrink-0 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-2.5 rounded-lg transition-colors text-xs font-medium"
                            >
                                Test ▶
                            </button>
                        </div>
                    </div>

                    {/* Speed & Pitch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm text-neutral-400">Speed</label>
                                <span className="text-xs text-teal-400 font-mono">{ttsRate.toFixed(1)}×</span>
                            </div>
                            <input
                                type="range" min="0.5" max="2.0" step="0.1"
                                value={ttsRate}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value)
                                    setTtsRate(val)
                                    localStorage.setItem('ttsRate', val.toString())
                                }}
                                className="w-full accent-teal-500 cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm text-neutral-400">Pitch</label>
                                <span className="text-xs text-teal-400 font-mono">{ttsPitch.toFixed(1)}</span>
                            </div>
                            <input
                                type="range" min="0.5" max="2.0" step="0.1"
                                value={ttsPitch}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value)
                                    setTtsPitch(val)
                                    localStorage.setItem('ttsPitch', val.toString())
                                }}
                                className="w-full accent-teal-500 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-neutral-800/60"></div>

                {/* Notification Melody */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div>
                        <h4 className="text-white font-medium group-hover:text-teal-400 transition-colors flex items-center gap-2">
                            <Music size={16} /> Notification Melody
                        </h4>
                        <p className="text-sm text-neutral-400 mt-0.5">Choose the audio tone played when a face match is found.</p>
                    </div>
                    <select
                        value={melody}
                        onChange={(e) => handleMelodyChange(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none w-full sm:w-auto min-w-35 cursor-pointer"
                    >
                        <option value="tech">Tech Arpeggio</option>
                        <option value="chime">Soft Chime</option>
                        <option value="beep">Classic Beep</option>
                    </select>
                </div>
            </div>
        </section>
    )
}
