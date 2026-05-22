import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    userId:      { type: String,  required: true },
    docId:       { type: String,  required: true },
    slotDate:    { type: String,  required: true },
    slotTime:    { type: String,  required: true },
    userData:    { type: Object,  required: true },
    docData:     { type: Object,  required: true },
    amount:      { type: Number,  required: true },
    date:        { type: Number,  required: true },
    cancelled:   { type: Boolean, default: false },
    payment:     { type: Boolean, default: false },
    checkedIn   : { type: Boolean, default: false },
checkinTime : { type: Number,  default: null  },
    isCompleted: { type: Boolean, default: false },
    status: { type: String, default: 'pending' }, // pending | confirmed
    cancelledBy: { type: String, default: '' },  // 'User' or 'Doctor'
    status: {
  type: String,
  default: "pending" // pending | confirmed
},

    // ── Razorpay payment details ──────────────────────────────────────
    // Saved by verifyRazorpay — used in invoice Transaction ID field
    razorpay_payment_id: { type: String, default: '' },
    razorpay_order_id:   { type: String, default: '' },
    razorpay_signature:  { type: String, default: '' },
})

const appointmentModel = mongoose.models.appointment
    || mongoose.model('appointment', appointmentSchema)

export default appointmentModel
