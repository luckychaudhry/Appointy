import React, { useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { io } from 'socket.io-client'
import ReviewModal from '../components/ReviewModal'
import VideoCall from '../components/VideoCall'
import AppointmentQR from '../components/AppointmentQR'
// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ item }) => {
  if (item.isCompleted) return (
    <div className='flex flex-col items-center gap-1'>
      <div className='sm:min-w-48 py-2 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500
        text-white text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-green-200'>
        <span>✅</span><span>Completed</span>
      </div>
      <p className='text-xs text-gray-400'>Treatment finished</p>
    </div>
  )
  if (item.cancelled) return (
    <div className='flex flex-col items-center gap-1'>
      <div className='sm:min-w-48 py-2 px-4 rounded-xl bg-red-50 border border-red-200
        text-red-500 text-sm font-medium flex items-center justify-center gap-2'>
        <span>🚫</span><span>Cancelled</span>
      </div>
      <p className='text-xs text-gray-400'>Slot has been freed</p>
    </div>
  )
  return null
}

// ── Timeline ──────────────────────────────────────────────────────────────────
const AppointmentTimeline = ({ item }) => {
  const isConfirmed = item.status === 'confirmed' || item.isCompleted
  const steps = [
    { label:'Booked',    done:true },
    { label:'Confirmed', done:isConfirmed },
    { label:'Paid',      done:!!item.payment },
    { label:'Completed', done:!!item.isCompleted },
  ]
  if (item.cancelled) return null
  const doneCnt = steps.filter(s => s.done).length
  const pct = doneCnt<=1?'0%':doneCnt===2?'33%':doneCnt===3?'66%':'calc(100% - 24px)'
  return (
    <div className='sm:min-w-48 mt-2'>
      <div className='flex items-center justify-between relative'>
        <div className='absolute left-3 right-3 top-3 h-0.5 bg-gray-200 z-0'/>
        <div className='absolute left-3 top-3 h-0.5 z-0 bg-primary transition-all duration-500' style={{width:pct}}/>
        {steps.map((step,i) => (
          <div key={i} className='flex flex-col items-center gap-1 z-10'>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all
              ${step.done?'bg-primary text-white shadow-md':'bg-gray-100 text-gray-400'}`}>
              {step.done?'✓':i+1}
            </div>
            <span className={`text-[9px] font-medium ${step.done?'text-primary':'text-gray-400'}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── minutesUntil helper ───────────────────────────────────────────────────────
const minutesUntil = (slotDate, slotTime) => {
  try {
    const [d,m,y]         = slotDate.split('_')
    const [timePart, per] = (slotTime||'').split(' ')
    const [hh, mm]        = timePart.split(':')
    let h = parseInt(hh)||0
    if (per==='PM'&&h!==12) h+=12
    if (per==='AM'&&h===12) h=0
    return (new Date(+y,+m-1,+d,h,parseInt(mm)||0) - new Date()) / 60000
  } catch { return 9999 }
}

const isCancelable = (slotDate, slotTime) => minutesUntil(slotDate, slotTime) > 60

// ─────────────────────────────────────────────────────────────────────────────
const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext)
  const navigate = useNavigate()

  const socketRef = useRef(null)

  const [appointments,       setAppointments]       = useState([])
  const [payment,            setPayment]            = useState('')
  const [downloadingInvoice, setDownloadingInvoice] = useState(null)
  const [downloadingRx,      setDownloadingRx]      = useState(null)
  const [rxModal,            setRxModal]            = useState(false)
  const [rxLoading,          setRxLoading]          = useState(false)
  const [rxList,             setRxList]             = useState([])
  const [rxAppt,             setRxAppt]             = useState(null)
  const [activeTab,          setActiveTab]          = useState('all')
  const [countdown,          setCountdown]          = useState('')
  const [reviewAppt, setReviewAppt] = useState(null)
const [reviewed,   setReviewed]   = useState({}) // { appointmentId: true }
  // Video call states
  const [videoCall,          setVideoCall]          = useState(null)
  const [incomingCall,       setIncomingCall]       = useState(null) // { appointmentId, doctorName }

  const MONTHS = [' ','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fmtDate = (s) => { const [d,m,y]=s.split('_'); return `${d} ${MONTHS[+m]} ${y}` }

  // ── Socket.io connect + listen for doctor call ───────────────────────────
  useEffect(() => {
    if (!token || !backendUrl) return

    socketRef.current = io(backendUrl, { transports: ['websocket'] })

    // Doctor ne call start ki — notification dikhao
    socketRef.current.on('call:incoming', ({ appointmentId, doctorName, meetLink }) => {
  setIncomingCall({ appointmentId, doctorName, meetLink })
  // Agar VideoCall modal already open hai (patient ne Join dabaya) toh meetLink update karo
  setVideoCall(prev =>
    prev?.appointmentId === appointmentId
      ? { ...prev, meetLink }
      : prev
  )
  toast.dismiss('call')
  toast.info(`📹 Dr. ${doctorName} has started the call!`, { autoClose: 8000, toastId: 'call' })
})
        
      

    // Doctor ne call end ki
    socketRef.current.on('call:ended', ({ appointmentId }) => {
      setIncomingCall(prev => prev?.appointmentId === appointmentId ? null : prev)
      setVideoCall(prev => prev?.appointmentId === appointmentId ? null : prev)
    })

    return () => socketRef.current?.disconnect()
  }, [token, backendUrl])

  // ── Fetch appointments ───────────────────────────────────────────────────
  const getUserAppointments = async () => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/user/appointments', {},
        { headers: { token } }
      )
      setAppointments(data.appointments.reverse())
    } catch (err) { toast.error(err.message) }
  }

  useEffect(() => {
    if (token) getUserAppointments()
  }, [token])

  useEffect(() => {
  if (token) {
    getUserAppointments()
    const interval = setInterval(() => {
      getUserAppointments()
    }, 3000) // 30 seconds
    return () => clearInterval(interval)
  }
}, [token])

  // ── Countdown for next appointment ──────────────────────────────────────
  const nextAppt = appointments.find(a => !a.cancelled && !a.isCompleted)
  useEffect(() => {
    if (!nextAppt) return
    const [d,m,y]     = nextAppt.slotDate.split('_')
    const [tp, per]   = nextAppt.slotTime.split(' ')
    const [hh, mm]    = tp.split(':')
    let h = parseInt(hh)
    if (per==='PM'&&h!==12) h+=12
    if (per==='AM'&&h===12) h=0
    const t = new Date(+y,+m-1,+d,h,parseInt(mm))
    const update = () => {
      const diff = t - new Date()
      if (diff<=0) { setCountdown('Now!'); return }
      const days = Math.floor(diff/86400000)
      const hrs  = Math.floor((diff%86400000)/3600000)
      const mins = Math.floor((diff%3600000)/60000)
      setCountdown(days>0?`${days}d ${hrs}h ${mins}m`:`${hrs}h ${mins}m`)
    }
    update()
    const iv = setInterval(update, 60000)
    return () => clearInterval(iv)
  }, [nextAppt])

  // ── Cancel ───────────────────────────────────────────────────────────────
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/user/cancel-appointment',
        { appointmentId }, { headers: { token } }
      )
      if (data.success) { toast.success(data.message); getUserAppointments(); getDoctorsData() }
      else toast.error(data.message)
    } catch (err) { toast.error(err.message) }
  }

  // ── Razorpay ─────────────────────────────────────────────────────────────
  const initPay = (order) => {
    new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount, currency: order.currency,
      name: 'Appointment Payment', description: 'Appointment Payment',
      order_id: order.id, receipt: order.receipt,
      handler: async (response) => {
        try {
          const { data } = await axios.post(backendUrl+'/api/user/verifyRazorpay', response, { headers:{token} })
          if (data.success) { navigate('/my-appointments'); getUserAppointments() }
        } catch (err) { toast.error(err.message) }
      }
    }).open()
  }

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl+'/api/user/payment-razorpay', {appointmentId}, {headers:{token}})
      if (data.success) initPay(data.order)
      else toast.error(data.message)
    } catch (err) { toast.error(err.message) }
  }

  // ── Downloads ────────────────────────────────────────────────────────────
  const downloadBlob = async (url, filename, setLoading, id) => {
    setLoading(id)
    try {
      const res  = await axios.get(url, { headers:{token}, responseType:'blob' })
      const link = document.createElement('a')
      link.href  = window.URL.createObjectURL(new Blob([res.data]))
      link.download = filename
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(link.href)
      toast.success('Downloaded!')
    } catch { toast.error('Download failed.') }
    finally { setLoading(null) }
  }

  const downloadInvoice = (id) =>
    downloadBlob(`${backendUrl}/api/user/invoice/${id}`, `Invoice-${id}.pdf`, setDownloadingInvoice, id)

  const downloadPrescription = (id) =>
    downloadBlob(`${backendUrl}/api/prescription/download/${id}`, `Prescription-${id}.pdf`, setDownloadingRx, id)

  // ── View Prescription ─────────────────────────────────────────────────────
  const viewPrescription = async (appt) => {
    setRxAppt(appt); setRxLoading(true); setRxModal(true); setRxList([])
    try {
      const { data } = await axios.get(`${backendUrl}/api/prescription/appointment/${appt._id}`, {headers:{token}})
      if (data.success) setRxList(data.prescriptions)
    } catch (e) { toast.error(e.message) }
    finally { setRxLoading(false) }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    if (activeTab === 'upcoming')  return !a.cancelled && !a.isCompleted && minutesUntil(a.slotDate, a.slotTime) > 0
    if (activeTab === 'expired')   return !a.cancelled && !a.isCompleted && minutesUntil(a.slotDate, a.slotTime) <= 0
    if (activeTab === 'completed') return a.isCompleted
    if (activeTab === 'cancelled') return a.cancelled
    return true
  })
  const counts = {
    all:       appointments.length,
    upcoming:  appointments.filter(a => !a.cancelled && !a.isCompleted && minutesUntil(a.slotDate, a.slotTime) > 0).length,
    completed: appointments.filter(a => a.isCompleted).length,
    cancelled: appointments.filter(a => a.cancelled).length,
    expired:   appointments.filter(a => !a.cancelled && !a.isCompleted && minutesUntil(a.slotDate, a.slotTime) <= 0).length,
  }

  return (
    <div className='max-w-4xl mx-auto'>

      {/* ── Incoming call notification banner ── */}
      {incomingCall && (
        <div className='fixed top-4 right-4 z-50 bg-white border border-violet-200
          rounded-2xl shadow-2xl p-4 flex items-center gap-4 max-w-sm
          animate-bounce'>
          <div className='w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0'>
            📹
          </div>
          <div className='flex-1'>
            <p className='font-semibold text-gray-800 text-sm'>Incoming Video Call</p>
            <p className='text-xs text-gray-500'>Dr. {incomingCall.doctorName} has started the call</p>
          </div>
          <div className='flex flex-col gap-1.5'>
            <button
              onClick={() => {
                const appt = appointments.find(a => a._id === incomingCall.appointmentId)
                setVideoCall({
                  appointmentId: incomingCall.appointmentId,
                  userName: appt?.userData?.name || 'Patient',
                  meetLink: incomingCall.meetLink
                })
                setIncomingCall(null)
              }}
              className='bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg
                hover:bg-green-600 transition-all font-medium'
            >
              Join
            </button>
            <button
              onClick={() => setIncomingCall(null)}
              className='bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-lg
                hover:bg-gray-200 transition-all'
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className='flex items-center justify-between mt-12 mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800'>My Appointments</h1>
          <p className='text-sm text-gray-400 mt-0.5'>{counts.all} total appointments</p>
        </div>
        {nextAppt && countdown && (
          <div className='hidden sm:flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5'>
            <span className='text-xl'>⏰</span>
            <div>
              <p className='text-xs text-indigo-400 font-medium'>Next appointment in</p>
              <p className='text-sm font-bold text-indigo-600'>{countdown}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className='flex gap-2 mb-6 border-b pb-0'>
        {[
          {key:'all',      label:'All',       color:'text-gray-600'},
          {key:'upcoming', label:'Upcoming',  color:'text-blue-500'},
          {key:'completed',label:'Completed', color:'text-green-500'},
          {key:'cancelled',label:'Cancelled', color:'text-red-400'},
          {key:'expired',  label:'Expired',   color:'text-orange-400'},
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors
              ${activeTab===tab.key ? tab.color+' border-b-2 border-primary -mb-px' : 'text-gray-400 hover:text-gray-600'}`}>
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
              ${activeTab===tab.key?'bg-primary/10 text-primary':'bg-gray-100 text-gray-400'}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Cards ── */}
      <div className='flex flex-col gap-4'>
        {filtered.length === 0 && (
          <div className='text-center py-16 text-gray-400'>
            <p className='text-4xl mb-3'>📅</p>
            <p className='text-sm'>No {activeTab === 'all' ? '' : activeTab} appointments</p>
          </div>
        )}

        {filtered.map((item, index) => (
          <div key={index} className={`relative rounded-2xl border overflow-hidden
            transition-all duration-300 bg-white
            ${item.isCompleted ? 'border-green-200 shadow-sm shadow-green-100'
              : item.cancelled ? 'border-red-100 opacity-75'
              : 'border-[#C9D8FF] hover:shadow-md'}`}>

            {item.isCompleted && <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500'/>}
            {item.cancelled   && <div className='absolute top-0 left-0 right-0 h-1 bg-red-300'/>}

            <div className='flex gap-4 p-5'>

              {/* Doctor image */}
              <div className='relative flex-shrink-0'>
                <img
                  className={`w-28 rounded-xl object-cover bg-[#EAEFFF] ${item.cancelled?'grayscale opacity-60':''}`}
                  src={item.docData.image} alt={item.docData.name}
                />
                {item.isCompleted && (
                  <div className='absolute inset-0 rounded-xl bg-green-500/20 flex items-center justify-center'>
                    <div className='w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg'>
                      <span className='text-white text-lg font-bold'>✓</span>
                    </div>
                  </div>
                )}
                {/* Completed badge */}
{item.isCompleted && (
  <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>
    Completed
  </button>
)}


                {item.cancelled && (
                  <div className='absolute inset-0 rounded-xl bg-red-500/10 flex items-center justify-center'>
                    <div className='w-10 h-10 rounded-full bg-red-400 flex items-center justify-center'>
                      <span className='text-white text-lg'>✕</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2 mb-1'>
                  <p className='text-base font-bold text-gray-800 truncate'>{item.docData.name}</p>
                  {item.payment && !item.cancelled && (
                    <span className='flex-shrink-0 text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium'>Paid</span>
                  )}
                </div>
                <p className='text-sm text-gray-500 mb-2'>{item.docData.speciality}</p>

                <div className='inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border mb-2'>
                  <span>📅</span>
                  <span className='font-medium'>{fmtDate(item.slotDate)}</span>
                  <span className='text-gray-300'>|</span>
                  <span>🕐</span>
                  <span>{item.slotTime}</span>
                </div>

                {/* Confirmation status chip */}
                {!item.cancelled && !item.isCompleted && (
                  <div className='mb-2'>
                    {item.status === 'confirmed'
                      ? <span className='inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium'>✓ Doctor confirmed</span>
                      : <span className='inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium'>⏳ Awaiting confirmation</span>
                    }
                  </div>
                )}

                <p className='text-xs text-gray-400 truncate'>📍 {item.docData.address?.line1}, {item.docData.address?.line2}</p>
                <AppointmentTimeline item={item} />
              </div>

              {/* Actions */}
              <div className='flex flex-col gap-2 justify-start items-end min-w-[140px]'>

                {/* Expired badge */}
                {!item.cancelled && !item.isCompleted && minutesUntil(item.slotDate, item.slotTime) <= 0 && (
                  <div className='w-full py-2 px-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-500 text-sm font-medium flex items-center justify-center gap-2'>
                    <span>⌛</span><span>Expired</span>
                  </div>
                )}

                <StatusBadge item={item} />

                {/* Video call join button — jab doctor ne call start ki ho */}
                {!item.cancelled && !item.isCompleted && item.status === 'confirmed' &&
                  incomingCall?.appointmentId === item._id && (
                  <button
                    onClick={() => {
                      setVideoCall({ appointmentId: item._id, userName: item.userData?.name || 'Patient', meetLink: incomingCall?.meetLink })
                      setIncomingCall(null)
                    }}
                    className='w-full py-2 px-4 rounded-xl text-xs font-medium
                      bg-gradient-to-r from-violet-500 to-purple-600 text-white
                      hover:from-violet-600 hover:to-purple-700 transition-all
                      animate-pulse flex items-center justify-center gap-1.5'
                  >
                    📹 Join Call
                  </button>
                )}

                {/* Pay Online */}
                {!item.cancelled && !item.payment && !item.isCompleted
                  && minutesUntil(item.slotDate, item.slotTime) > 0
                  && payment !== item._id && (
                  <button onClick={() => setPayment(item._id)}
                    className='w-full py-2 px-4 rounded-xl text-xs font-medium bg-primary text-white hover:bg-indigo-600 transition-all'>
                    💳 Pay Online
                  </button>
                )}

                {/* Razorpay */}
                {!item.cancelled && !item.payment && !item.isCompleted
                  && minutesUntil(item.slotDate, item.slotTime) > 0
                  && payment === item._id && (
                  <button onClick={() => appointmentRazorpay(item._id)}
                    className='w-full py-2 px-4 rounded-xl border flex items-center justify-center hover:bg-gray-50'>
                    <img className='h-5' src={assets.razorpay_logo} alt="Razorpay"/>
                  </button>
                )}
                {/* ← YE ADD KARO — Rate button */}
{item.isCompleted && !reviewed[item._id] && (
  <button
    onClick={() => setReviewAppt(item)}
    className='sm:min-w-48 py-2 border border-yellow-400 rounded text-yellow-500
      hover:bg-yellow-400 hover:text-white transition-all duration-300
      flex items-center justify-center gap-1'
  >
    ⭐ Rate Doctor
  </button>
)}
{item.isCompleted && reviewed[item._id] && (
  <button className='sm:min-w-48 py-2 border border-yellow-200 rounded text-yellow-400 cursor-default'>
    ✓ Reviewed
  </button>
)}
                {/* Prescription */}
                {item.isCompleted && (
                  <>
                    <button onClick={() => viewPrescription(item)}
                      className='w-full py-2 px-4 rounded-xl text-xs font-medium border border-blue-200 text-blue-500 hover:bg-blue-50 transition-all'>
                      💊 View Prescription
                    </button>
                    <button onClick={() => downloadPrescription(item._id)} disabled={downloadingRx === item._id}
                      className='w-full py-2 px-4 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50'>
                      {downloadingRx === item._id ? '...' : '📄 Download Rx'}
                    </button>
                  </>
                )}
           {/* QR Code */}
{!item.cancelled && item.isConfirmed && (
  <AppointmentQR
    appointment={item}
    userData={item.userData}
  />
)}
                {/* Invoice */}
                {item.payment && (
                  <button onClick={() => downloadInvoice(item._id)} disabled={downloadingInvoice === item._id }
                    className='w-full py-2 px-4 rounded-xl text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50'>
                      
                    {downloadingInvoice === item._id ? '...' : '🧾 Invoice'}
                  </button>
                )}

                {/* Cancel */}
                {!item.cancelled && !item.isCompleted && isCancelable(item.slotDate, item.slotTime) && (
                  <button onClick={() => cancelAppointment(item._id)}
                    className='w-full py-2 px-4 rounded-xl text-xs font-medium border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400 transition-all'>
                    Cancel
                  </button>
                )}

              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Video Call Modal ── */}
      {videoCall && (
        <VideoCall
          appointmentId={videoCall.appointmentId}
          userName={videoCall.userName}
          role='patient'
          socket={socketRef.current}
          meetLink={videoCall.meetLink}
          onClose={() => setVideoCall(null)}
        />
      )}

      {/* ── Prescription Modal ── */}
      {rxModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-5 border-b'>
              <div>
                <p className='text-lg font-semibold text-gray-800'>Prescription</p>
                {rxAppt && <p className='text-sm text-gray-500'>Dr. {rxAppt.docData?.name} · {fmtDate(rxAppt.slotDate)}</p>}
              </div>
              <button onClick={() => setRxModal(false)} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
            </div>
            <div className='p-5'>
              {rxLoading ? (
                <div className='flex justify-center py-12'>
                  <div className='w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin'/>
                </div>
              ) : rxList.length === 0 ? (
                <div className='text-center py-10 text-gray-400'>
                  <p className='text-4xl mb-3'>💊</p>
                  <p className='text-sm'>No prescription added by doctor yet.</p>
                </div>
              ) : (
                <div className='flex flex-col gap-3'>
                  {rxList.map(p => (
                    <div key={p._id} className='border rounded-xl p-4 bg-gray-50'>
                      <p className='font-semibold text-gray-800'>
                        {p.medicineName} <span className='text-primary text-sm font-normal'>{p.dosage}</span>
                      </p>
                      <p className='text-sm text-gray-500 mt-0.5'>{p.frequency} · {p.timing||'—'}</p>
                      <p className='text-xs text-gray-400 mt-1'>{p.durationDays} days · Ends {new Date(p.endDate).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                  <div className='bg-green-50 rounded-xl px-4 py-3 text-xs text-green-700'>
                    Daily reminders sent via SMS + email until course ends.
                  </div>
                </div>
              )}
            </div>
            {rxList.length > 0 && (
              <div className='px-5 pb-5 flex gap-3'>
                <button onClick={() => setRxModal(false)} className='flex-1 py-2.5 border rounded-xl text-sm text-gray-600'>Close</button>
                <button onClick={() => { setRxModal(false); downloadPrescription(rxAppt._id) }} disabled={downloadingRx === rxAppt?._id}
                  className='flex-1 py-2.5 bg-primary text-white rounded-xl text-sm hover:bg-indigo-600 disabled:opacity-60'>
                  {downloadingRx === rxAppt?._id ? '...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Review Modal */}
{reviewAppt && (
  <ReviewModal
    appointment={reviewAppt}
    onClose={() => setReviewAppt(null)}
    onSubmitted={() => {
      setReviewed(prev => ({ ...prev, [reviewAppt._id]: true }))
      getDoctorsData()  // ← YE ADD KARO — doctors data refresh hoga
    }}
  />
)}
    </div>
  )
}

export default MyAppointments