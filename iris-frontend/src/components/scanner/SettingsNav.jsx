export function SettingsNav({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${active
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.1)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}>
            <span className={active ? 'scale-110 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-transform' : ''}>
                {icon}
            </span>
            {label}
        </button>
    )
}
