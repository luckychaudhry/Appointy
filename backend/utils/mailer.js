import nodemailer from 'nodemailer'

// Reusable transporter — reads from .env
// Works with Gmail, Outlook, or any SMTP provider
// import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
})

transporter.verify((err) => {
  if (err) console.log('Mailer not ready:', err.message)
  else console.log('✅ Mailer ready')
})

export default transporter

// Verify connection on startup (optional — remove in prod if noisy)
// transporter.verify((error) => {
//   if (error) {
//     console.error('Mailer not ready:', error.message)
//   } else {
//     console.log('Mailer ready')
//   }
// })

// export default transporter
