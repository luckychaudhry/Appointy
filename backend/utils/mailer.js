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
// import { Resend } from 'resend'

// const resend = new Resend(process.env.RESEND_API_KEY)

// const transporter = {
//   sendMail: async ({ from, to, subject, html }) => {
//     const { error } = await resend.emails.send({
//       from: 'Appointy <onboarding@resend.dev>',
//       to, subject, html
//     })
//     if (error) throw error
//     return { success: true }
//   }
// }

// export default transporter
import fetch from 'node-fetch'

const transporter = {
  sendMail: async ({ to, subject, html }) => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Appointy Healthcare', email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    })
    const data = await res.json()
    if (data.messageId) console.log('✅ Email sent')
    else throw new Error(JSON.stringify(data))
  }
}

export default transporter
