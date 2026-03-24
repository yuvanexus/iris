import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons (Leaflet + bundlers issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom bus marker icon
function createBusIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            background: ${color};
            width: 32px; height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
        ">🚌</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    })
}

// Auto-fit map bounds to markers
function FitBounds({ positions }) {
    const map = useMap()
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]))
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
        }
    }, [positions, map])
    return null
}

const STATE_COLORS = {
    on_the_way: '#3b82f6',
    stopped: '#f59e0b',
    arrived: '#10b981',
}

/**
 * LiveBusMap — shows all buses with their current location on a Leaflet map.
 * Also draws polyline routes for location history if provided.
 *
 * Props:
 *  - buses: array of bus objects (id, bus_number, state, etc.)
 *  - busStatuses: { [busId]: statusObj } with current_location + students_present
 *  - historyPoints: optional array of { lat, lng } for route history polyline
 *  - selectedBusId: optional — highlight one bus
 */
export function LiveBusMap({ buses = [], busStatuses = {}, historyPoints = [], selectedBusId = null }) {
    // Gather all positions to fit bounds
    const positions = useMemo(() => {
        const pts = []
        buses.forEach(b => {
            const status = busStatuses[b.id]
            if (status?.current_location) {
                pts.push({
                    lat: status.current_location.latitude,
                    lng: status.current_location.longitude,
                    bus: status.bus || b,  // Use status.bus if available for latest state
                    status,
                })
            }
        })
        return pts
    }, [buses, busStatuses])

    // Default center (India) if no positions
    const center = positions.length > 0
        ? [positions[0].lat, positions[0].lng]
        : [20.5937, 78.9629]

    const historyLatLngs = historyPoints.map(p => [p.latitude, p.longitude])

    return (
        <div className="rounded-2xl overflow-hidden border border-neutral-800" style={{ height: '400px' }}>
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%', background: '#171717' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {positions.length > 0 && <FitBounds positions={positions} />}

                {/* Bus markers */}
                {positions.map(({ lat, lng, bus, status }) => {
                    const stateColor = STATE_COLORS[bus.state] || STATE_COLORS.stopped
                    const isSelected = selectedBusId && String(bus.id) === String(selectedBusId)

                    return (
                        <Marker
                            key={bus.id}
                            position={[lat, lng]}
                            icon={createBusIcon(isSelected ? '#14b8a6' : stateColor)}
                        >
                            <Popup>
                                <div style={{ minWidth: 160, fontFamily: 'Inter, sans-serif' }}>
                                    <strong style={{ fontSize: 14 }}>{bus.bus_number}</strong>
                                    <br />
                                    <span style={{ fontSize: 12, color: '#999' }}>
                                        {bus.route_name || 'No route'}
                                    </span>
                                    <br />
                                    <span style={{
                                        fontSize: 11,
                                        color: stateColor,
                                        fontWeight: 600,
                                    }}>
                                        {bus.state === 'on_the_way' ? '🔵 On the Way' : bus.state === 'arrived' ? '🟢 Arrived' : '🟡 Stopped'}
                                    </span>
                                    <br />
                                    <span style={{ fontSize: 11, color: '#aaa' }}>
                                        👨‍🎓 {status.students_present} student{status.students_present !== 1 ? 's' : ''} on board
                                    </span>
                                    <br />
                                    <span style={{ fontSize: 10, color: '#666' }}>
                                        Speed: {status.current_location?.speed?.toFixed(1) || 0} km/h
                                    </span>
                                    <br />
                                    <span style={{ fontSize: 10, color: '#666' }}>
                                        Updated: {new Date(status.current_location.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}

                {/* History route polyline */}
                {historyLatLngs.length > 1 && (
                    <Polyline
                        positions={historyLatLngs}
                        pathOptions={{
                            color: '#14b8a6',
                            weight: 3,
                            opacity: 0.7,
                            dashArray: '8, 6',
                        }}
                    />
                )}
            </MapContainer>
        </div>
    )
}
