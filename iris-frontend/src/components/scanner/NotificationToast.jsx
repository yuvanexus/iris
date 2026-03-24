import { MapPin, ScanFace } from 'lucide-react'

export function NotificationToast({ notification }) {
    return (
        <div className={`absolute top-24 md:top-6 right-4 md:right-6 z-20 pointer-events-auto transition-all duration-500 transform ${notification ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95 pointer-events-none'}`} style={{ transitionTimingFunction: 'ease-out' }}>
            <div className="bg-black/80 backdrop-blur-xl border border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.3)] rounded-2xl p-4 w-[calc(100vw-2rem)] md:w-80 overflow-hidden relative">
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/5 to-transparent z-0"></div>

                <div className="relative z-10 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <ScanFace size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <h4 className="text-emerald-400 font-bold truncate text-base">{notification?.name || ''}</h4>
                            <span className="text-[10px] font-medium text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">MATCH</span>
                        </div>
                        <p className="text-xs text-neutral-300 truncate">{notification?.role || ''}</p>
                        <div className="flex items-center gap-1.5 text-neutral-400 mt-2 text-[10px]">
                            <MapPin size={10} />
                            <span>{notification?.location || ''}</span>
                            <span className="mx-1">•</span>
                            <span>{notification?.time || ''}</span>
                        </div>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
                    <div className={`h-full bg-emerald-500 ${notification ? 'animate-[shrink_4s_linear]' : ''}`}></div>
                </div>
            </div>
        </div>
    )
}
