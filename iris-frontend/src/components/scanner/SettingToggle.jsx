import { useState, useEffect } from 'react'

export function SettingToggle({ title, description, enabled, storageKey }) {
    const [isEnabled, setIsEnabled] = useState(enabled)

    useEffect(() => {
        if (storageKey) {
            const saved = localStorage.getItem(storageKey)
            if (saved !== null) {
                setIsEnabled(saved === 'true')
            } else {
                localStorage.setItem(storageKey, enabled.toString())
            }
        }
    }, [storageKey, enabled])

    const handleToggle = () => {
        const newValue = !isEnabled
        setIsEnabled(newValue)
        if (storageKey) {
            localStorage.setItem(storageKey, newValue.toString())
        }
    }

    return (
        <div className="flex items-center justify-between gap-4 group cursor-pointer" onClick={handleToggle}>
            <div>
                <h4 className="text-white font-medium group-hover:text-teal-400 transition-colors">{title}</h4>
                <p className="text-sm text-neutral-400 mt-0.5">{description}</p>
            </div>
            <button
                type="button"
                className={`cursor-pointer relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-teal-500' : 'bg-neutral-700'
                    }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    )
}
