export function StatCard({ icon, label, value }) {
    return (
        <div className="bg-black/60 backdrop-blur-md border border-neutral-800 rounded-xl p-3 md:p-4 flex items-center gap-3 shrink-0 shadow-xl transition-transform hover:scale-105">
            <div className="p-2.5 bg-neutral-800/80 rounded-lg border border-neutral-700/50 shadow-inner">
                {icon}
            </div>
            <div>
                <p className="text-[10px] md:text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</p>
                <p className="text-lg md:text-xl font-bold bg-linear-to-r from-white to-neutral-300 bg-clip-text text-transparent leading-tight">{value}</p>
            </div>
        </div>
    )
}
