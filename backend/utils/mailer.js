// import nodemailer from 'nodemailer'

// // Reusable transporter — reads from .env
// // Works with Gmail, Outlook, or any SMTP provider
// // import nodemailer from 'nodemailer'

// const transporter = nodemailer.createTransport({
//   host: 'smtp.sendgrid.net',
//   port: 587,
//   secure: false,
//   auth: {
//     user: 'apikey',
//     pass: process.env.SENDGRID_API_KEY
//   }
// })

// transporter.verify((err) => {
//   if (err) console.log('Mailer not ready:', err.message)
//   else console.log('✅ Mailer ready')
// })

// export default transporter

// Verify connection on startup (optional — remove in prod if noisy)
// transporter.verify((error) => {
//   if (error) {
//     console.error('Mailer not ready:', error.message)
//   } else {
//     console.log('Mailer ready')
//   }
// })

// export default transporter
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const transporter = {
  sendMail: async ({ from, to, subject, html }) => {
    const { error } = await resend.emails.send({
      from: 'Appointy <onboarding@resend.dev>',
      to, subject, html
    })
    if (error) throw error
    return { success: true }
  }
}

export default transporter
