// utils/mailer.js
// Sends booking-related email notifications.
//
// Two modes, chosen automatically based on your .env:
//
// 1) REAL EMAIL — if EMAIL_USER and EMAIL_PASS are set in .env, real emails
//    are sent through that account (e.g. a Gmail address with an "App
//    Password"). Use this for your final demo so the examiner can see a
//    real email land in an inbox.
//
// 2) TEST MODE (default) — if no email credentials are configured, an
//    Ethereal test account is created automatically the first time an email
//    is sent. Nothing is really delivered, but a preview link is printed to
//    the terminal so you can open the email in your browser. This lets the
//    feature work out of the box with zero setup while you're developing.

const nodemailer = require('nodemailer');

let transporterPromise = null;

function getTransporter() {
    if (transporterPromise) return transporterPromise;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Real email mode
        transporterPromise = Promise.resolve(
            nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            })
        );
    } else {
        // Test mode — auto-create a free Ethereal inbox
        transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
            console.log('📧 No EMAIL_USER/EMAIL_PASS set — using a test inbox (Ethereal).');
            return nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass }
            });
        });
    }

    return transporterPromise;
}

async function sendMail({ to, subject, html }) {
    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
            from: '"Tutor Booking System" <no-reply@tutorbooking.local>',
            to,
            subject,
            html
        });

        // In test mode, nodemailer gives us a shareable preview URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📧 Email sent (preview): ${previewUrl}`);
        } else {
            console.log(`📧 Email sent to ${to}: ${subject}`);
        }
    } catch (err) {
        // Email failures should never break the booking flow itself —
        // just log it so the request can still succeed.
        console.error('❌ Failed to send email:', err.message);
    }
}

// ---------- Templates for each notification type ----------

function bookingCreatedEmail({ studentName, tutorName, subject, date, time }) {
    return {
        subject: `Booking request sent — ${subject}`,
        html: `
            <p>Hi ${studentName},</p>
            <p>Your booking request has been sent to <strong>${tutorName}</strong>:</p>
            <ul>
                <li><strong>Subject:</strong> ${subject}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
            </ul>
            <p>Status: <strong>Pending</strong> — you'll get another email once the tutor responds.</p>
            <p>— Tutor Booking System</p>
        `
    };
}

function newBookingRequestEmail({ tutorName, studentName, subject, date, time }) {
    return {
        subject: `New booking request from ${studentName}`,
        html: `
            <p>Hi ${tutorName},</p>
            <p><strong>${studentName}</strong> has requested a session with you:</p>
            <ul>
                <li><strong>Subject:</strong> ${subject}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
            </ul>
            <p>Log in to your dashboard to approve or reject this request.</p>
            <p>— Tutor Booking System</p>
        `
    };
}

function bookingStatusEmail({ studentName, tutorName, subject, date, time, status }) {
    const statusText = status === 'approved' ? 'approved ✅' : 'rejected ❌';
    return {
        subject: `Your booking was ${status} — ${subject}`,
        html: `
            <p>Hi ${studentName},</p>
            <p><strong>${tutorName}</strong> has ${statusText} your booking request:</p>
            <ul>
                <li><strong>Subject:</strong> ${subject}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
            </ul>
            <p>— Tutor Booking System</p>
        `
    };
}

module.exports = {
    sendMail,
    bookingCreatedEmail,
    newBookingRequestEmail,
    bookingStatusEmail
};
