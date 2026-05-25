import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

const AppointmentQR = ({ appointment, userData }) => {
  const { } = useContext(AppContext)
  const [showModal, setShowModal] = useState(false)

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

  // ── Short QR data — sirf essential fields, no JWT ──────────────────────────
  const qrData = JSON.stringify({
    id: shortId,
    p:  (userData?.name || '').slice(0, 12),
    d:  (appointment.docData?.name || '').slice(0, 12),
    dt: appointment.slotDate,
    t:  appointment.slotTime,
  })

  const whatsappMsg = `🏥 *Appointy Appointment*\n\n👤 Patient: ${userData?.name}\n👨‍⚕️ Doctor: ${appointment.docData?.name}\n📅 Date: ${slotDateFormatted}\n⏰ Time: ${appointment.slotTime}\n💳 Payment: ${paymentStatus}\n🔖 ID: ${shortId}`

  const downloadQR = () => {
    const svg = document.querySelector('#qr-svg-wrapper svg')
    if (!svg) return
    const canvas = document.createElement('canvas')
    canvas.width  = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 320, 320)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 10, 10, 300, 300)
      const a = document.createElement('a')
      a.download = `Appointy-QR-${shortId}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
      new XMLSerializer().serializeToString(svg)
    )))
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setShowModal(true)}
        className='flex items-center gap-1.5 text-xs text-[#5f6fff] border border-[#5f6fff]
          rounded-lg px-3 py-1.5 hover:bg-[#5f6fff] hover:text-white transition-all duration-200'
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

      {/* ── Modal ── */}
      {showModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          {/* Card */}
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden flex flex-col'>

            {/* Header */}
            <div className='px-5 pt-5 pb-3 flex items-start justify-between'>
              <div>
                <h2 className='text-base font-semibold text-gray-800'>Appointment QR</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Show this at the clinic counter</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100'
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                  <path d='M18 6 6 18M6 6l12 12'/>
                </svg>
              </button>
            </div>

            {/* Appointment ID badge */}
            <div className='mx-5 mb-3 bg-[#5f6fff0d] border border-[#5f6fff25] rounded-xl px-4 py-2.5 flex items-center justify-between'>
              <div>
                <p className='text-[9px] text-[#5f6fff] font-semibold uppercase tracking-widest mb-0.5'>
                  Appointment ID
                </p>
                <p className='text-xl font-mono font-bold text-[#5f6fff] tracking-widest'>{shortId}</p>
              </div>
              <div className='flex flex-col items-end gap-1'>
                <div className='flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full'
                  style={{ background: `${statusColor}18`, color: statusColor }}>
                  <span className='w-1.5 h-1.5 rounded-full' style={{ background: statusColor }}/>
                  {statusLabel}
                </div>
                <div className='flex items-center gap-1 text-[9px] text-green-600 font-medium'>
                  <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                    <rect x='3' y='11' width='18' height='11' rx='2'/>
                    <path d='M7 11V7a5 5 0 0 1 10 0v4'/>
                  </svg>
                  Secure
                </div>
              </div>
            </div>

            {/* QR Code — clean, scannable */}
            <div className='flex justify-center px-5 pb-3'>
              <div
                id='qr-svg-wrapper'
                className='bg-white border border-gray-100 rounded-xl p-3 shadow-sm'
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
            <div className='px-5 border-t border-gray-100 pt-3 pb-3'>
              {[
                { label: 'Patient',  value: userData?.name || 'N/A' },
                { label: 'Doctor',   value: appointment.docData?.name || 'N/A' },
                { label: 'Date',     value: slotDateFormatted },
                { label: 'Time',     value: appointment.slotTime || 'N/A' },
                { label: 'Payment',  value: paymentStatus, color: appointment.payment ? '#10b981' : '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} className='flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0'>
                  <span className='text-xs text-gray-400'>{label}</span>
                  <span className='text-xs font-medium text-right max-w-[55%] truncate'
                    style={{ color: color || '#374151' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons — INSIDE the card */}
            <div className='flex gap-2 px-5 pb-4'>
              <button
                onClick={downloadQR}
                className='flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                  border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600
                  hover:bg-gray-100 transition-all'
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
                className='flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                  bg-[#25D366] text-white text-xs font-medium
                  hover:bg-[#20bd5a] transition-all'
              >
                <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z'/>
                </svg>
                WhatsApp
              </button>
            </div>

            {/* Footer */}
            <div className='bg-gray-50 px-5 py-2 text-center border-t border-gray-100'>
              <p className='text-[10px] text-gray-400'>
                Scan QR or enter ID:{' '}
                <span className='font-mono font-semibold text-gray-600'>{shortId}</span>
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

export default AppointmentQR
ENDOFFILE
echo "Done"
Output

Done
Done

You are out of free messages until 4:30 PM
