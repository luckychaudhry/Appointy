import React, { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import axios from 'axios'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
 
const AppointmentQR = ({ appointment, userData }) => {
  const { backendUrl, token } = useContext(AppContext)
  const [showModal, setShowModal]   = useState(false)
  const [qrToken, setQrToken]       = useState(null)   // signed JWT from backend
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState('')
 
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
 
  const paymentStatus = appointment.payment
    ? (typeof appointment.payment === 'object'
        ? `Paid (Txn: ${appointment.payment.razorpay_payment_id || 'N/A'})`
        : 'Paid Online')
    : 'Pay at Clinic'
 
  const statusColor = appointment.cancelled ? '#ef4444'
    : appointment.isCompleted ? '#10b981' : '#5f6fff'
 
  const statusLabel = appointment.cancelled ? 'Cancelled'
    : appointment.isCompleted ? 'Completed' : 'Confirmed'
 
  // Fetch signed QR token from backend when modal opens
  const fetchQrToken = async () => {
    setTokenLoading(true)
    setTokenError('')
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/qr-token/${appointment._id}`,
        { headers: { token } }
      )
      if (data.success) {
        setQrToken(data.qrToken)
      } else {
        setTokenError('QR not generated')
      }
    } catch {
      setTokenError('Server error')
    } finally {
      setTokenLoading(false)
    }
  }
 
  const handleOpen = () => {
    setShowModal(true)
    fetchQrToken()
  }
 
  return (
    <>
      <button
        onClick={handleOpen}
        className='flex items-center gap-1 text-sm text-[#5f6fff] border border-[#5f6fff] rounded-lg px-3 py-1.5 hover:bg-[#5f6fff] hover:text-white transition-all duration-200'
      >
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/>
          <rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='4' height='4' rx='0.5'/>
          <rect x='20' y='14' width='1' height='1'/><rect x='14' y='20' width='1' height='1'/><rect x='18' y='18' width='3' height='3' rx='0.5'/>
        </svg>
        View QR
      </button>
 
      {showModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden'>
 
            {/* Header */}
            <div className='px-6 pt-6 pb-4 flex items-start justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-gray-800'>Appointment QR</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Show this at the clinic counter</p>
              </div>
              <button onClick={() => setShowModal(false)} className='text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100'>
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'><path d='M18 6 6 18M6 6l12 12'/></svg>
              </button>
            </div>
 
            {/* Short ID — prominent */}
            <div className='mx-6 mb-3 bg-[#5f6fff0d] border border-[#5f6fff30] rounded-xl px-4 py-3 flex items-center justify-between'>
              <div>
                <p className='text-[10px] text-[#5f6fff] font-semibold uppercase tracking-widest mb-0.5'>Appointment ID</p>
                <p className='text-2xl font-mono font-bold text-[#5f6fff] tracking-widest'>{shortId}</p>
              </div>
              <div className='flex flex-col items-end gap-1.5'>
                <div className='flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full' style={{ background: `${statusColor}15`, color: statusColor }}>
                  <span className='w-1.5 h-1.5 rounded-full' style={{ background: statusColor }} />
                  {statusLabel}
                </div>
                {/* Encrypted badge */}
                <div className='flex items-center gap-1 text-[10px] text-green-600 font-medium'>
                  <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                    <rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>
                  </svg>
                  JWT Secured
                </div>
              </div>
            </div>
 
            {/* QR Code */}
            <div className='flex justify-center px-6 pb-4'>
              <div className='bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-center' style={{ minHeight: 212 }}>
                {tokenLoading && (
                  <div className='flex flex-col items-center gap-2'>
                    <svg className='animate-spin text-[#5f6fff]' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4'/>
                    </svg>
                    <p className='text-xs text-gray-400'>Secured QR is generating...</p>
                  </div>
                )}
                {tokenError && <p className='text-xs text-red-500 text-center'>{tokenError}</p>}
                {qrToken && !tokenLoading && (
                  <QRCodeSVG
                    value={qrToken}
                    size={180}
                    level='H'
                    includeMargin={false}
                    fgColor='#1e293b'
                    bgColor='transparent'
                  />
                )}
              </div>
            </div>
 
            {/* Info rows */}
            <div className='px-6 pb-5 border-t border-gray-100 pt-4'>
              {[
                { label: 'Patient',  value: userData?.name || 'N/A' },
                { label: 'Doctor',   value: appointment.docData?.name || 'N/A' },
                { label: 'Dept.',    value: appointment.docData?.speciality || 'N/A' },
                { label: 'Date',     value: slotDateFormatted },
                { label: 'Time',     value: appointment.slotTime || 'N/A' },
                { label: 'Payment',  value: paymentStatus, color: appointment.payment ? '#10b981' : '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} className='flex justify-between items-center py-2 border-b border-gray-50 last:border-0'>
                  <span className='text-xs text-gray-400'>{label}</span>
                  <span className='text-xs font-medium text-gray-700 text-right max-w-[60%] truncate' style={color ? { color } : {}}>{value}</span>
                </div>
              ))}
            </div>
 
            {/* Footer */}
            <div className='bg-gray-50 px-6 py-2.5 text-center'>
              <p className='text-[11px] text-gray-400'>
                please scan the QR code or enter the appointment ID: <span className='font-mono font-semibold text-gray-600'>{shortId}</span>
              </p>
            </div>
 
          </div>
        </div>
      )}
    </>
  )
}
 
export default AppointmentQR