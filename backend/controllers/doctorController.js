import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import transporter from "../utils/mailer.js";
import { patientCancelEmail } from "../utils/cancelEmailTemplates.js";
import userModel from "../models/userModel.js";

// Doctor login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await doctorModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get doctor's appointments
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.user.id;
    const appointments = await appointmentModel.find({ docId });
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel appointment — slot FREE MAT KARO (doctor cancel = slot locked rahe)
const appointmentCancel = async (req, res) => {
  try {
    const docId = req.user.id;
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
  if (appointment.checkedIn) {
      return res.json({ success: false, message: 'Patient check-in cannot be cancelled now' })
    }
    if (!appointment || appointment.docId.toString() !== docId) {
      return res.status(403).json({
        success: false,
        message: "Invalid doctor or appointment"
      });
    }

    // cancel appointment
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
      cancelledBy: 'Doctor'
    });

    // 🔥 get latest user data
    const user = await userModel.findById(appointment.userId);

    // 🔥 send mail to patient
    if (user?.email) {

      const { subject, html } = patientCancelEmail({
        patientName: user.name,
        doctorName: appointment.docData?.name,
        speciality: appointment.docData?.speciality,
        slotDate: appointment.slotDate,
        slotTime: appointment.slotTime,
        wasPaid: appointment.payment,
        amount: appointment.amount,
        cancelledBy: "Doctor"
      });

      transporter.sendMail({
        from: `"Appointy Healthcare" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject,
        html
      })
      .then(() => console.log("✅ Cancel mail sent"))
      .catch(err => console.log("❌ Mail error:", err));
    }

    res.json({
      success: true,
      message: "Appointment Cancelled"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const confirmAppointment = async (req, res) => {
  try {
    const docId = req.user.id;
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) {
      return res.status(403).json({ success: false, message: "Invalid doctor or appointment" });
    }
    if (appointment.cancelled) {
      return res.json({ success: false, message: "Cannot confirm a cancelled appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      status: "confirmed"
    });

    res.json({ success: true, message: "Appointment Confirmed" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Complete appointment — slot FREE MAT KARO (completed slot locked rahe)
const appointmentComplete = async (req, res) => {
  try {
    const docId = req.user.id;
    const { appointmentId } = req.body;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.docId.toString() !== docId) {
      return res.status(403).json({ success: false, message: "Invalid doctor or appointment" });
    }

    // ── Sirf isCompleted save karo ──
    // slots_booked ko touch NAHI karna — slot locked rehna chahiye
    await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });

    res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all doctors (for frontend list)
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password -email");
    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle doctor availability
const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!docId) return res.status(400).json({ success: false, message: "Doctor ID missing" });

    const doctor = await doctorModel.findById(docId);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    doctor.available = !doctor.available;
    await doctor.save();

    res.json({ success: true, message: "Availability changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get doctor profile
const doctorProfile = async (req, res) => {
  try {
    const docId = req.user.id;
    const profile = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
  try {
    const docId = req.user.id;
    const { fees, address, available, about } = req.body;
    await doctorModel.findByIdAndUpdate(docId, { fees, address, available, about });
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get doctor dashboard
const doctorDashboard = async (req, res) => {
  try {
    const docId = req.user.id;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    const patientSet = new Set();

    appointments.forEach(a => {
      if (a.isCompleted || a.payment) earnings += a.amount;
      patientSet.add(a.userId.toString());
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patientSet.size,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

 const reassignSlot = async (req, res) => {
  try {
    const docId = req.user.id
    const { appointmentId, newSlotDate, newSlotTime } = req.body

    const appointment = await appointmentModel.findById(appointmentId)
    if (!appointment || appointment.docId.toString() !== docId)
      return res.json({ success: false, message: 'Invalid appointment' })

    // Purana slot free karo
    const doctor = await doctorModel.findById(docId)
    let slots_booked = doctor.slots_booked

    if (slots_booked[appointment.slotDate]) {
      slots_booked[appointment.slotDate] = slots_booked[appointment.slotDate]
        .filter(t => t !== appointment.slotTime)
    }

    // Naya slot book karo
    if (!slots_booked[newSlotDate]) slots_booked[newSlotDate] = []
    slots_booked[newSlotDate].push(newSlotTime)

    await doctorModel.findByIdAndUpdate(docId, { slots_booked })

    // Appointment update karo
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      slotDate: newSlotDate,
      slotTime: newSlotTime,
      status:   'confirmed',  // auto confirm
    })

    res.json({ success: true, message: 'Slot reassigned successfully' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export {
  loginDoctor,
  appointmentsDoctor,
  confirmAppointment,
  reassignSlot,
  appointmentCancel,
  appointmentComplete,
  doctorList,
  changeAvailability,
  doctorProfile,
  updateDoctorProfile,
  doctorDashboard,
};
