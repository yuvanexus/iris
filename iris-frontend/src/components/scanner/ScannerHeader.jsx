import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Settings2, RefreshCw, Bus, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'

const BUS_STATES = [
    { key: 'on_the_way', label: 'On the Way', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { key: 'stopped',    label: 'Stopped',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
]

export function ScannerHeader({ isReady, facingMode, toggleFacingMode, busId, busState, onBusStateChange, token }) {
    const [arriving, setArriving] = useState(false)

    const handleStateChange = (newState) => {
        if (!busId || newState === busState) return
        onBusStateChange(newState)

        fetch(api.updateBusState(busId), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ state: newState }),
        }).catch(err => console.error('Failed to update bus state:', err))
    }

    const handleMarkArrived = async () => {
        if (!busId || arriving) return
        setArriving(true)
        try {
            const res = await fetch(api.arriveBus(busId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            })
            const data = await res.json()
            if (res.ok) {
                onBusStateChange('arrived')
                console.log(`[SCANNER] Bus arrived. ${data.students_exited} student(s) auto-exited.`)
            } else {
                console.error('Arrive failed:', data.detail)
            }
        } catch (err) {
            console.error('Failed to mark bus as arrived:', err)
        } finally {
            setArriving(false)
        }
    }

    return (
        <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10 pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-start gap-2 max-w-[70vw]">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-neutral-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-800 shadow-xl shrink-0">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className={isReady ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" : "absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"}></span>
                            <span className={isReady ? "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" : "relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"}></span>
                        </span>
                        <span className={isReady ? "text-[10px] md:text-xs font-medium text-emerald-400 border-r border-neutral-700 pr-2 mr-1" : "text-[10px] md:text-xs font-medium text-amber-400 border-r border-neutral-700 pr-2 mr-1"}>
                            {isReady ? "Active" : "Starting"}
                        </span>
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-pulse"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-[10px] md:text-xs font-medium text-blue-400">
                            Connected
                        </span>
                    </div>
                </div>

                {/* Bus State Selector */}
                {busId && (
                    <div className="flex flex-wrap items-center gap-2">
                        {/* on_the_way / stopped toggle — hidden when arrived */}
                        {busState !== 'arrived' && (
                            <div className="flex items-center gap-1.5 bg-neutral-900/60 backdrop-blur-md rounded-full border border-neutral-800 p-1 shadow-xl">
                                <Bus size={14} className="text-neutral-500 ml-1.5" />
                                {BUS_STATES.map(s => (
                                    <button
                                        key={s.key}
                                        onClick={() => handleStateChange(s.key)}
                                        className={`text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                            busState === s.key
                                                ? s.color
                                                : 'text-neutral-500 border-transparent hover:text-neutral-300'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                                <span className="text-[9px] text-neutral-600 ml-1 mr-1.5">GPS Auto</span>
                            </div>
                        )}

                        {/* Mark Arrived / Arrived pill */}
                        {busState === 'arrived' ? (
                            <div className="flex items-center gap-1.5 bg-emerald-500/15 backdrop-blur-md rounded-full border border-emerald-500/40 px-3 py-1.5 shadow-xl">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                <span className="text-[10px] md:text-xs font-semibold text-emerald-400">
                                    Bus Arrived — Students Exited
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleMarkArrived}
                                disabled={arriving}
                                className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/40 px-3 py-1.5 shadow-xl hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Mark bus as arrived and auto-exit all on-board students"
                            >
                                {arriving
                                    ? <Loader2 size={13} className="text-emerald-400 animate-spin" />
                                    : <CheckCircle2 size={13} className="text-emerald-400" />
                                }
                                <span className="text-[10px] md:text-xs font-semibold text-emerald-400">
                                    {arriving ? 'Arriving…' : 'Mark Arrived'}
                                </span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                <Link to="/scanner/settings" className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-white hover:bg-white/20 hover:text-teal-400 transition-all shadow-xl max-md:p-2 cursor-pointer focus:outline-none">
                    <Settings2 size={20} />
                </Link>
                <button
                    onClick={toggleFacingMode}
                    className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-white hover:bg-white/20 hover:text-teal-400 transition-all shadow-xl max-md:p-2 cursor-pointer focus:outline-none"
                    title="Switch Camera"
                >
                    <RefreshCw size={20} className={facingMode === 'user' ? '' : 'rotate-180'} />
                </button>
            </div>
        </header>
    )
}
