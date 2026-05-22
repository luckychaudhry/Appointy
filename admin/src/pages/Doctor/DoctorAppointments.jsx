import React, { useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'
import { io } from 'socket.io-client'
import VideoCall from '../../components/VideoCall'

const emptyMed = () => ({
  medicineName: '', dosage: '',
  frequency: 'Once a day', timing: 'After meals', durationDays: 5
})

const FREQ   = ['Once a day','Twice a day','Three times a day','Four times a day','Every 8 hours','Every 6 hours','As needed']
const TIMING = ['Before meals','After meals','With meals','At bedtime','In the morning','Empty stomach']
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDate = s => { if(!s) return ''; const [d,m,y]=s.split('_'); return `${d} ${MONTHS[+m]} ${y}` }

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment, confirmAppointment, backendUrl } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)
  const navigate = useNavigate()
  const socketRef = useRef(null)

  const [modal,      setModal]      = useState(null)
  const [activeAppt, setActiveAppt] = useState(null)
  const [medicines,  setMedicines]  = useState([emptyMed()])
  const [existing,   setExisting]   = useState([])
  const [editIdx,    setEditIdx]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [videoCall,  setVideoCall]  = useState(null)
  const [editRow,    setEditRow]    = useState({})
  const [reassignAppt, setReassignAppt] = useState(null)
const [selectedSlot, setSelectedSlot] = useState(null)
const [reassigning,  setReassigning]  = useState(false)

  // Socket.io connect
  useEffect(() => {
    if (!dToken || !backendUrl) return
    socketRef.current = io(backendUrl, { transports: ['websocket'] })
    return () => socketRef.current?.disconnect()
  }, [dToken, backendUrl])

  useEffect(() => { if (dToken) getAppointments() }, [dToken])

  const fetchPrescriptions = async (apptId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/prescription/appointment/${apptId}`,
        { headers: { dToken } }
      )
      if (data.success) setExisting(data.prescriptions)
    } catch (e) { console.error(e) }
  }

  const openAdd  = async (appt) => { setActiveAppt(appt); await fetchPrescriptions(appt._id); setMedicines([emptyMed()]); setModal('add') }
  const openView = async (appt) => { setActiveAppt(appt); await fetchPrescriptions(appt._id); setEditIdx(null); setModal('view') }

  const updMed = (i,k,v) => setMedicines(p => { const a=[...p]; a[i]={...a[i],[k]:v}; return a })
  const addRow = () => setMedicines(p => [...p, emptyMed()])
  const remRow = (i) => setMedicines(p => p.filter((_,j)=>j!==i))

  const savePrescription = async () => {
    if (medicines.find(m => !m.medicineName.trim() || !m.dosage.trim()))
      return toast.error('Fill medicine name and dosage for all rows')
    setSaving(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/prescription/add`,
        { appointmentId: activeAppt._id, medicines },
        { headers: { dToken } }
      )
      if (data.success) {
        toast.success('Prescription saved!')
        await fetchPrescriptions(activeAppt._id)
        setModal('view')
      } else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const saveEdit = async (pres) => {
    setSaving(true)
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/prescription/update/${pres._id}`,
        { medicineName:pres.medicineName, dosage:pres.dosage, frequency:pres.frequency, timing:pres.timing, durationDays:pres.durationDays },
        { headers: { dToken } }
      )
      if (data.success) { toast.success('Updated!'); setEditIdx(null); await fetchPrescriptions(activeAppt._id) }
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const deleteRow = async (presId) => {
    if (!window.confirm('Remove this medicine?')) return
    try {
      const { data } = await axios.delete(`${backendUrl}/api/prescription/delete/${presId}`, { headers: { dToken } })
      if (data.success) { toast.success('Medicine removed'); await fetchPrescriptions(activeAppt._id) }
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
  }
  const isExpired = (slotDate, slotTime) => {
  try {
    const [d, m, y]   = slotDate.split('_')
    const [tp, per]   = (slotTime || '').split(' ')
    const [hh, mm]    = tp.split(':')
    let h = parseInt(hh)
    if (per === 'PM' && h !== 12) h += 12
    if (per === 'AM' && h === 12) h = 0
    return new Date(+y, +m - 1, +d, h, parseInt(mm)) < new Date()
  } catch { return false }
}

const getDoctorFreeSlots = () => {
  const freeSlots = []
  const today = new Date()

  // Appointments se booked slots build karo
  const bookedMap = {}
  appointments.forEach(a => {
    if (!a.cancelled) {
      if (!bookedMap[a.slotDate]) bookedMap[a.slotDate] = []
      bookedMap[a.slotDate].push(a.slotTime)
    }
  })

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const date = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
    const booked = bookedMap[date] || []   // ← appointments se
    for (let h = 10; h < 21; h++) {
      for (const min of ['00', '30']) {
        const period = h < 12 ? 'AM' : 'PM'
        const displayH = h > 12 ? h - 12 : h
        const time = `${displayH.toString().padStart(2,'0')}:${min} ${period}`
        if (!booked.includes(time)) {
          freeSlots.push({ date, time, display: `${d.getDate()}/${d.getMonth()+1} ${time}` })
        }
      }
    }
  }
  return freeSlots.slice(0, 20)
}
   
  const closeModal = () => { setModal(null); setActiveAppt(null); setExisting([]); setEditIdx(null) }
  const startEdit  = (p,i) => { setEditRow({...p}); setEditIdx(i) }
  const updEdit    = (k,v) => setEditRow(p => ({...p,[k]:v}))

  return (
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b'>
          <p>#</p><p>Patient</p><p>Payment</p><p>Age</p><p>Date & Time</p><p>Fees</p><p>Action</p>
        </div>

        {appointments.map((item, index) => (
          <div key={index}
            className='flex flex-wrap justify-between max-sm:gap-5 sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1
              items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50'>
            <p className='max-sm:hidden'>{index + 1}</p>
            <div className='flex items-center gap-2'>
              <img src={item.userData.image} className='w-8 rounded-full' alt="" />
              <p>{item.userData.name}</p>
            </div>
            <div>
              <p className='text-xs inline border border-primary px-2 rounded-full'>
                {item.payment ? 'Online' : 'CASH'}
              </p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
            <p>{currency}{item.amount}</p>

            {item.cancelled ? (
              <div className='flex flex-col'>
                <p className='text-red-400 text-xs font-medium'>Cancelled</p>
                <p className='text-[10px] text-gray-400'>by {item.cancelledBy || 'User'}</p>
              </div>
            ) : item.isCompleted ? (
              <div className='flex flex-col gap-1'>
                <p className='text-green-500 text-xs font-semibold'>✓ Completed</p>
                <button onClick={() => openView(item)}
                  className='text-xs border border-blue-400 text-blue-500 rounded px-2 py-1 hover:bg-blue-50 transition-all'>
                  View Rx
                </button>
                <button onClick={() => openAdd(item)}
                  className='text-xs border border-primary text-primary rounded px-2 py-1 hover:bg-primary hover:text-white transition-all'>
                  + Edit Rx
                </button>
              </div>
            ) // Cancelled / Completed ke baad ye add karo
: isExpired(item.slotDate, item.slotTime) && !item.isCompleted && !item.cancelled
? (
  <div className='flex flex-col gap-1'>
    <span className='text-xs text-orange-500 font-semibold'>⌛ Expired</span>
    <button
      onClick={() => setReassignAppt(item)}
      className='text-xs bg-orange-500 text-white px-2 py-1.5 rounded-lg
        hover:bg-orange-600 transition-all flex items-center gap-1 justify-center'
    >
      🔄 Reassign Slot
    </button>
  </div>
)
            : item.status === 'confirmed' ? (
              <div className='flex flex-col gap-1'>
                <span className='text-xs text-blue-500 font-semibold'>✓ Confirmed</span>
{/* Video Call — doctor Meet link enter kare */}
                <button
                  onClick={() => setVideoCall({
                    appointmentId: item._id,
                    userName: `Dr. ${item.docData?.name || 'Doctor'}`
                  })}
                  className='text-xs bg-violet-500 text-white px-2 py-1 rounded-lg
                    hover:bg-violet-600 transition-all flex items-center gap-1 justify-center'
                >
                  📹 Start Call
                </button>
                <div className='flex gap-1 mt-0.5'>
                  <img onClick={() => completeAppointment(item._id)} className='w-8 cursor-pointer' src={assets.tick_icon} alt="complete" />
                  <img onClick={() => cancelAppointment(item._id)}   className='w-8 cursor-pointer' src={assets.cancel_icon} alt="cancel" />
                </div>
              </div>
            ) : (
              <div className='flex flex-col gap-1'>
                <span className='text-[10px] text-amber-500 font-semibold uppercase'>Pending</span>
                <div className='flex gap-1'>
                  <button onClick={() => confirmAppointment && confirmAppointment(item._id)}
                    className='text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600'>
                    Confirm
                  </button>
                  <img onClick={() => cancelAppointment(item._id)} className='w-8 cursor-pointer' src={assets.cancel_icon} alt="cancel" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Video Call Modal ── */}
      {videoCall && (
        <VideoCall
          appointmentId={videoCall.appointmentId}
          userName={videoCall.userName}
          role='doctor'
          socket={socketRef.current}
         onClose={() => setVideoCall(null)}
        />
      )}

      {/* ── View Prescription Modal ── */}
      {modal === 'view' && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-5 border-b'>
              <div>
                <p className='text-lg font-semibold text-gray-800'>Prescription</p>
                <p className='text-sm text-gray-500'>{activeAppt?.userData?.name} — {fmtDate(activeAppt?.slotDate)}</p>
              </div>
              <div className='flex items-center gap-3'>
                <button onClick={() => setModal('add')}
                  className='text-sm border border-primary text-primary px-4 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all'>
                  + Add / Replace
                </button>
                <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
              </div>
            </div>
            <div className='p-5'>
              {existing.length === 0 ? (
                <div className='text-center py-10 text-gray-400'>
                  <p className='text-4xl mb-3'>💊</p>
                  <p>No prescription added yet.</p>
                  <button onClick={() => setModal('add')} className='mt-4 bg-primary text-white px-6 py-2 rounded-xl text-sm'>Add Prescription</button>
                </div>
              ) : (
                <div className='flex flex-col gap-3'>
                  {existing.map((p, i) => (
                    <div key={p._id} className='border rounded-xl p-4 bg-gray-50'>
                      {editIdx === i ? (
                        <div>
                          <p className='text-xs font-medium text-primary mb-3'>Editing medicine {i + 1}</p>
                          <div className='grid grid-cols-2 gap-3'>
                            {[{label:'Medicine name',key:'medicineName',placeholder:'e.g. Paracetamol'},{label:'Dosage',key:'dosage',placeholder:'e.g. 500mg'}].map(f => (
                              <div key={f.key}>
                                <label className='text-xs text-gray-500'>{f.label}</label>
                                <input value={editRow[f.key]||''} onChange={e=>updEdit(f.key,e.target.value)} placeholder={f.placeholder}
                                  className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'/>
                              </div>
                            ))}
                            <div>
                              <label className='text-xs text-gray-500'>Frequency</label>
                              <select value={editRow.frequency||''} onChange={e=>updEdit('frequency',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'>
                                {FREQ.map(f=><option key={f}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className='text-xs text-gray-500'>Timing</label>
                              <select value={editRow.timing||''} onChange={e=>updEdit('timing',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'>
                                {TIMING.map(t=><option key={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className='text-xs text-gray-500'>Duration (days)</label>
                              <input type='number' min='1' max='365' value={editRow.durationDays||5} onChange={e=>updEdit('durationDays',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'/>
                            </div>
                          </div>
                          <div className='flex gap-2 mt-3'>
                            <button onClick={()=>saveEdit(editRow)} disabled={saving} className='flex-1 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-60'>{saving?'Saving...':'Save changes'}</button>
                            <button onClick={()=>setEditIdx(null)} className='flex-1 py-2 border rounded-lg text-sm text-gray-600'>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex-1'>
                            <p className='font-semibold text-gray-800'>{p.medicineName} <span className='text-primary'>{p.dosage}</span></p>
                            <p className='text-sm text-gray-500 mt-0.5'>{p.frequency} · {p.timing||'—'} · {p.durationDays} days</p>
                            <p className='text-xs text-gray-400 mt-1'>Ends: {new Date(p.endDate).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div className='flex gap-2'>
                            <button onClick={()=>startEdit(p,i)} className='text-xs border border-amber-400 text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50'>Edit</button>
                            <button onClick={()=>deleteRow(p._id)} className='text-xs border border-red-400 text-red-500 px-3 py-1 rounded-lg hover:bg-red-50'>Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      

      {/* ── Add Prescription Modal ── */}
      {modal === 'add' && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-5 border-b'>
              <div>
                <p className='text-lg font-semibold text-gray-800'>{existing.length > 0 ? 'Replace prescription' : 'Add prescription'}</p>
                <p className='text-sm text-gray-500'>{activeAppt?.userData?.name}</p>
              </div>
              <button onClick={()=>existing.length>0?setModal('view'):closeModal()} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
            </div>
            <div className='p-5 flex flex-col gap-4'>
              {medicines.map((med,idx) => (
                <div key={idx} className='border rounded-xl p-4 bg-gray-50 relative'>
                  {medicines.length > 1 && <button onClick={()=>remRow(idx)} className='absolute top-3 right-3 text-red-400 text-xs'>Remove</button>}
                  <p className='text-xs font-medium text-primary mb-3'>Medicine {idx+1}</p>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-xs text-gray-500'>Medicine name *</label>
                      <input value={med.medicineName} onChange={e=>updMed(idx,'medicineName',e.target.value)} placeholder='e.g. Paracetamol' className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'/>
                    </div>
                    <div>
                      <label className='text-xs text-gray-500'>Dosage *</label>
                      <input value={med.dosage} onChange={e=>updMed(idx,'dosage',e.target.value)} placeholder='e.g. 500mg' className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'/>
                    </div>
                    <div>
                      <label className='text-xs text-gray-500'>Frequency</label>
                      <select value={med.frequency} onChange={e=>updMed(idx,'frequency',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'>
                        {FREQ.map(f=><option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs text-gray-500'>Timing</label>
                      <select value={med.timing} onChange={e=>updMed(idx,'timing',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'>
                        {TIMING.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs text-gray-500'>Duration (days)</label>
                      <input type='number' min='1' max='365' value={med.durationDays} onChange={e=>updMed(idx,'durationDays',e.target.value)} className='w-full mt-1 border rounded-lg px-3 py-2 text-sm'/>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addRow} className='border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-primary hover:text-primary'>
                + Add another medicine
              </button>
            </div>
            <div className='flex gap-3 px-5 pb-5'>
              <button onClick={()=>existing.length>0?setModal('view'):closeModal()} className='flex-1 py-2.5 border rounded-xl text-sm text-gray-600'>Back</button>
              <button onClick={savePrescription} disabled={saving} className='flex-1 py-2.5 bg-primary text-white rounded-xl text-sm disabled:opacity-60'>
                {saving?'Saving...':'Save & activate reminders'}
              </button>
            </div>
          </div>
        </div>
      )}
      {reassignAppt && (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
    <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-6'>
      <div className='flex justify-between items-center mb-4'>
        <div>
          <p className='text-lg font-bold text-gray-800'>Reassign Slot</p>
          <p className='text-sm text-gray-500'>
            Patient: {reassignAppt.userData?.name} · 
            Old slot: {reassignAppt.slotDate?.replace(/_/g,'/')} {reassignAppt.slotTime}
          </p>
        </div>
        <button onClick={() => { setReassignAppt(null); setSelectedSlot(null) }}
          className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
      </div>

      <p className='text-sm font-medium text-gray-600 mb-3'>
        Select a new slot for the patient:
      </p>

      <div className='grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-4'>
        {getDoctorFreeSlots().map((slot, i) => (
          <button key={i}
            onClick={() => setSelectedSlot(slot)}
            className={`text-xs py-2 px-3 rounded-lg border text-left transition-all
              ${selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                ? 'bg-primary text-white border-primary'
                : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
          >
            📅 {slot.display}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <div className='bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700'>
          New slot: <strong>{selectedSlot.display}</strong>
        </div>
      )}

      <div className='flex gap-3'>
        <button onClick={() => { setReassignAppt(null); setSelectedSlot(null) }}
          className='flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500'>
          Cancel
        </button>
        <button
          disabled={!selectedSlot || reassigning}
          onClick={async () => {
            if (!selectedSlot) return
            setReassigning(true)
            try {
              const { data } = await axios.post(
                `${backendUrl}/api/doctor/reassign-slot`,
                {
                  appointmentId: reassignAppt._id,
                  newSlotDate:   selectedSlot.date,
                  newSlotTime:   selectedSlot.time,
                },
                { headers: { dToken } }
              )
              if (data.success) {
                toast.success('Slot reassigned! Patient will see new time.')
                setReassignAppt(null)
                setSelectedSlot(null)
                getAppointments()
              } else {
                toast.error(data.message)
              }
            } catch (err) {
              toast.error(err.message)
            } finally {
              setReassigning(false)
            }
          }}
          className='flex-2 flex-1 py-2.5 bg-primary text-white rounded-xl text-sm
            font-semibold disabled:opacity-50 disabled:cursor-not-allowed
            hover:bg-indigo-600 transition-all'
        >
          {reassigning ? 'Reassigning...' : '✅ Confirm Reassign'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}

export default DoctorAppointments