import React from 'react'
import { useContext } from 'react'
import { useEffect,useState,useRef } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import VideoCall from '../../components/VideoCall'
import { io } from 'socket.io-client'
// import { get } from 'mongoose'
// return ke last </div> se pehle:


const DoctorDashboard = () => {

  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment, confirmAppointment, backendUrl } = useContext(DoctorContext)
  const { slotDateFormat, currency } = useContext(AppContext)
  const [videoCall, setVideoCall] = useState(null)

  const socketRef = useRef(null)
  

  useEffect(() => {
    getDashData()
    if (!dToken || !backendUrl) return
    socketRef.current = io(backendUrl, { transports: ['websocket'] })
    return () => socketRef.current?.disconnect()
  }, [dToken, backendUrl])

  return dashData && (
    <div className='m-5'>

      <div className='flex flex-wrap gap-3'>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.earning_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{currency} {dashData.earnings}</p>
            <p className='text-gray-400'>Earnings</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.appointments_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.appointments}</p>
            <p className='text-gray-400'>Appointments</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.patients_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.patients}</p>
            <p className='text-gray-400'>Patients</p></div>
        </div>
      </div>

      <div className='bg-white'>
        <div className='flex items-center gap-2.5 px-4 py-4 mt-10 rounded-t border'>
          <img src={assets.list_icon} alt="" />
          <p className='font-semibold'>Latest Bookings</p>
        </div>

        <div className='pt-4 border border-t-0'>
          {dashData.latestAppointments.slice(0, 5).map((item, index) => (
            <div className='flex items-center px-6 py-3 gap-3 hover:bg-gray-100' key={index}>
              <img className='rounded-full w-10' src={item.userData.image} alt="" />
              <div className='flex-1 text-sm'>
                <p className='text-gray-800 font-medium'>{item.userData.name}</p>
                <p className='text-gray-600 '>Booking on {slotDateFormat(item.slotDate)}</p>
              </div>
              {item.cancelled ? (
                <div className='flex flex-col'>
                  <p className='text-red-400 text-xs font-medium'>Cancelled</p>
                  <p className='text-[10px] text-gray-400'>by {item.cancelledBy || 'User'}</p>
                </div>
              ) : item.isCompleted ? (
                <p className='text-green-500 text-xs font-medium'>✓ Completed</p>
              ) : item.status === 'confirmed' ? (
                <div className='flex flex-col gap-1'>
                  <p className='text-blue-500 text-xs font-semibold'>✓ Confirmed</p>
                  <button
                    onClick={() => setVideoCall({ appointmentId: item._id, userName: `Dr. ${item.docData?.name}` })}
                    className='text-xs bg-violet-500 text-white px-2 py-1 rounded hover:bg-violet-600'
                  >
                    📹 Video Call
                  </button>
                  <div className='flex gap-1'>
                    <img onClick={() => completeAppointment(item._id)} className='w-8 cursor-pointer' src={assets.tick_icon} alt="complete" />
                    <img onClick={() => cancelAppointment(item._id)} className='w-8 cursor-pointer' src={assets.cancel_icon} alt="cancel" />
                  </div>
                </div>
              ) : (
                <div className='flex flex-col gap-1'>
                  <p className='text-amber-500 text-[10px] font-semibold uppercase'>Pending</p>
                  <div className='flex gap-1 items-center'>
                    <button
                      onClick={() => confirmAppointment(item._id)}
                      className='text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600'
                    >Confirm</button>
                    <img onClick={() => cancelAppointment(item._id)} className='w-7 cursor-pointer' src={assets.cancel_icon} alt="cancel" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
          {videoCall && <VideoCall appointmentId={videoCall.appointmentId} userName={videoCall.userName} role='doctor' socket={socketRef.current} onClose={() => setVideoCall(null)} />}
    </div>
  )
}

export default DoctorDashboard