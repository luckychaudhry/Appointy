import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

const AppointmentQR = ({ appointment, userData }) => {
  const { } = useContext(AppContext)
  const [showModal, setShowModal] = useState(false)

  React.useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  if (!appointment) return null

  const shortId = appointment._id?.slice(-8).toUpperCase() || 'N/A'

  const slotDateFormatted = (() => {
    if (!appointment.slotDate) return 'N/A'
    const parts = appointment.slotDate.split('_')
    if (parts.length === 3) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return `${parseInt(parts[0])} ${months[parseInt(parts[1]) - 1]} ${parts[2]}`
    }
    return appointment.slotDate
  })()

  const paymentStatus = appointment.payment ? 'Paid Online' : 'Pay at Clinic'

  const statusColor = appointment.cancelled ? '#ef4444'
    : appointment.isCompleted ? '#10b981' : '#5f6fff'

  const statusLabel = appointment.cancelled ? 'Cancelled'
    : appointment.isCompleted ? 'Completed' : 'Confirmed'

  const qrData = JSON.stringify({
    id: shortId,
    p:  (userData?.name || '').slice(0, 12),
    d:  (appointment.docData?.name || '').slice(0, 12),
    dt: appointment.slotDate,
    t:  appointment.slotTime,
  })

  const whatsappMsg =
    `🏥 *Appointy Appointment*\n\n` +
    `👤 Patient: ${userData?.name || 'N/A'}\n` +
    `👨‍⚕️ Doctor: ${appointment.docData?.name || 'N/A'}\n` +
    `📅 Date: ${slotDateFormatted}\n` +
    `⏰ Time: ${appointment.slotTime || 'N/A'}\n` +
    `💳 Payment: ${paymentStatus}\n` +
    `🔖 ID: ${shortId}`

  const downloadQR = () => {
    const svg = document.querySelector('#qr-svg-wrapper svg')
    if (!svg) return
    const size = 340
    const canvas = document.createElement('canvas')
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    // solid white background — no transparency
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    const svgClone = svg.cloneNode(true)
    svgClone.setAttribute('width',  String(size - 20))
    svgClone.setAttribute('height', String(size - 20))
    const svgData = new XMLSerializer().serializeToString(svgClone)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 10, 10, size - 20, size - 20)
      const a = document.createElement('a')
      a.download = `Appointy-QR-${shortId}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setShowModal(true)}
        className='flex items-center gap-1.5 text-xs text-[#5f6fff] border border-[#5f6fff]
          rounded-lg px-3 py-1.5 hover:bg-[#5f6fff] hover:text-white transition-all duration-200 w-full justify-center'
      >
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <rect x='3' y='3' width='7' height='7' rx='1'/>
          <rect x='14' y='3' width='7' height='7' rx='1'/>
          <rect x='3' y='14' width='7' height='7' rx='1'/>
          <rect x='14' y='14' width='4' height='4' rx='0.5'/>
          <rect x='20' y='20' width='1' height='1'/>
        </svg>
        QR Code
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className='w-full max-w-xs overflow-hidden flex flex-col'
            style={{
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            }}>

            {/* Header */}
            <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', margin: 0 }}>Appointment QR</p>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Show this at the clinic counter</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af' }}
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                  <path d='M18 6 6 18M6 6l12 12'/>
                </svg>
              </button>
            </div>

            {/* ID Badge */}
            <div style={{
              margin: '0 20px 12px',
              background: '#f0f1ff',
              border: '1px solid #d0d3ff',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 9, color: '#5f6fff', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                  Appointment ID
                </p>
                <p style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: '#5f6fff', letterSpacing: '0.15em', margin: 0 }}>
                  {shortId}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${statusColor}18`, borderRadius: 20,
                  padding: '2px 8px', fontSize: 11, fontWeight: 500, color: statusColor
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }}/>
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* QR Code — solid white, no transparency */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 12px' }}>
              <div
                id='qr-svg-wrapper'
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                  display: 'inline-block',
                  lineHeight: 0,         // removes gap below svg
                }}
              >
                <QRCodeSVG
                  value={qrData}
                  size={190}
                  level='M'
                  includeMargin={false}
                  fgColor='#1e293b'
                  bgColor='#ffffff'
                />
              </div>
            </div>

            {/* Info rows */}
            <div style={{ padding: '0 20px 12px', borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
              {[
                { label: 'Patient',  value: userData?.name || 'N/A' },
                { label: 'Doctor',   value: appointment.docData?.name || 'N/A' },
                { label: 'Date',     value: slotDateFormatted },
                { label: 'Time',     value: appointment.slotTime || 'N/A' },
                { label: 'Payment',  value: paymentStatus, color: appointment.payment ? '#10b981' : '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', borderBottom: '1px solid #f9fafb'
                }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: color || '#374151', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
              <button
                onClick={downloadQR}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '9px 0', borderRadius: 12,
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  fontSize: 12, fontWeight: 500, color: '#4b5563', cursor: 'pointer'
                }}
              >
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
                  <polyline points='7 10 12 15 17 10'/>
                  <line x1='12' y1='15' x2='12' y2='3'/>
                </svg>
                Download
              </button>

              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '9px 0', borderRadius: 12,
                  border: 'none', background: '#25D366',
                  fontSize: 12, fontWeight: 500, color: '#ffffff', cursor: 'pointer'
                }}
              >
                <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z'/>
                </svg>
                WhatsApp
              </button>
            </div>

            {/* Footer */}
            <div style={{
              background: '#f9fafb', borderTop: '1px solid #f3f4f6',
              padding: '8px 20px', textAlign: 'center'
            }}>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                Scan QR or enter ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6b7280' }}>{shortId}</span>
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

export default AppointmentQR
