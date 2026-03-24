export function ScanningAnimation({ isReady, notification }) {
    return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10] transition-opacity duration-300 pointer-events-none ${isReady && !notification ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-400 rounded-tl-xl transition-all duration-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-400 rounded-tr-xl transition-all duration-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-400 rounded-bl-xl transition-all duration-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-400 rounded-br-xl transition-all duration-500"></div>
                <div className="absolute inset-0 bg-teal-500/5 animate-pulse rounded-xl"></div>

                {/* Scanning Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_8px_2px_rgba(45,212,191,0.5)] animate-[scan_3s_ease-in-out_infinite]"></div>

                <div className="absolute -bottom-16 flex flex-col items-center gap-1 bg-black/60 backdrop-blur-md border border-teal-500/30 px-6 py-2 rounded-2xl shadow-2xl">
                    <h2 className="text-white/90 font-bold text-sm tracking-wide">Live Recognition</h2>
                    <span className="text-teal-400 text-[10px] md:text-xs font-mono tracking-widest">SCANNING...</span>
                </div>
            </div>
        </div>
    )
}
