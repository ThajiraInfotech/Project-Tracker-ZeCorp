require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
    console.log('Starting FINAL verification email...');
    console.log('Service:', process.env.EMAIL_SERVICE);
    console.log('From:', process.env.EMAIL_FROM);

    try {
        const info = await emailService.sendEmail(
            'arshadhahamed777@gmail.com',
            'ZeCorp Final Verification',
            '<h1>System Operational</h1><p>This email confirms that the ZeCorp email system is fully configured with explicit SMTP checks and TLS hardening.</p>'
        );
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

testEmail();
