import nodemailer from 'nodemailer'

// Reusable transporter — reads from .env
// Works with Gmail, Outlook, or any SMTP provider
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',      // ← yeh add karo
  port: 587,                    // ← yeh add karo
  secure: false,                // ← yeh add karo
  family: 4,                    // ← sabse zaroori — IPv4 force karo
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Verify connection on startup (optional — remove in prod if noisy)
transporter.verify((error) => {
  if (error) {
    console.error('Mailer not ready:', error.message)
  } else {
    console.log('Mailer ready')
  }
})

export default transporter
