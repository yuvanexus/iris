import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

function getDaysInMonth(year, month) {
    const days = []
    const date = new Date(year, month, 1)
    while (date.getMonth() === month) {
        days.push(new Date(date))
        date.setDate(date.getDate() + 1)
    }
    return days
}

export function AttendanceCalendar({ allRecords, onDateClick }) {
    const navigate = useNavigate()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())

    const goToPrevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
        else setViewMonth(m => m - 1)
    }
    
    const goToNextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
        else setViewMonth(m => m + 1)
    }
    
    const goToToday = () => {
        setViewYear(today.getFullYear())
        setViewMonth(today.getMonth())
    }

    const handleDateClick = (date) => {
        if (onDateClick) {
            onDateClick(date)
            return
        }
        
        const d = new Date(date)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        navigate({ to: `/admin/attendance/${dateStr}` })
    }

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDayOfWeek = daysInMonth.length > 0 ? daysInMonth[0].getDay() : 0

    // Map allRecords by date for dots
    const attendanceByDate = {}
    if (allRecords && allRecords.length > 0) {
        allRecords.forEach(rec => {
            const dt = new Date(rec.timestamp)
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
            if (!attendanceByDate[key]) attendanceByDate[key] = true
        })
    }

    return (
        <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-white font-semibold flex-1">
                    <Calendar size={18} className="text-emerald-500" />
                    <span>Attendance History</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={goToPrevMonth} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-center min-w-30">
                        <span className="text-white font-medium text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                    </div>
                    <button onClick={goToNextMonth} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                    <button onClick={goToToday} className="ml-2 text-xs text-emerald-400 hover:underline px-2 py-1 bg-emerald-500/10 rounded">Today</button>
                    <input
                        type="date"
                        max={todayStr}
                        onChange={(e) => {
                            if (e.target.value) {
                                const selectedDate = new Date(e.target.value)
                                // Adjust for local timezone to prevent off-by-one errors
                                selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset())
                                
                                if (onDateClick) {
                                    onDateClick(selectedDate)
                                } else {
                                    navigate({ to: `/admin/attendance/${e.target.value}` })
                                }
                            }
                        }}
                        className="ml-3  bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-1.5 text-lg font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
                    />
                </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-7 mb-2">
                    {WEEKDAY_LABELS.map(d => (
                        <div key={d} className="text-center py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:min-h-20" />
                    ))}

                    {daysInMonth.map(date => {
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        const hasData = attendanceByDate[dateStr]
                        const isToday = dateStr === todayStr
                        const isFuture = date > today

                        return (
                            <button
                                key={dateStr}
                                disabled={isFuture}
                                onClick={() => handleDateClick(date)}
                                className={`
                                    aspect-square sm:aspect-auto sm:min-h-20 rounded-xl flex flex-col items-center sm:items-start sm:p-2 justify-center sm:justify-start relative transition-all duration-200 border group
                                    ${isFuture ? 'opacity-30 cursor-not-allowed border-transparent' : 'hover:border-emerald-500/30 hover:bg-neutral-800 cursor-pointer'}
                                    ${isToday ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-neutral-900/40 border-neutral-800 text-neutral-300'}
                                `}
                            >
                                <span className={`text-sm sm:text-base ${isToday ? 'font-bold' : 'font-medium'}`}>
                                    {date.getDate()}
                                </span>
                                {hasData && !isFuture && (
                                    <>
                                        {/* Mobile dot indicator */}
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] mt-1 sm:hidden" />
                                        
                                        <div className="hidden sm:block mt-auto w-full">
                                            <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 w-full text-center block wrap-break-word">
                                                Records available
                                            </span>
                                        </div>
                                    </>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
