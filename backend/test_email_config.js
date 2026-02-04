require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Starting email test with verbose logging...');

    const isSecure = process.env.SMTP_PORT == 465 || process.env.SMTP_SECURE === 'true';
    const config = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: isSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        },
        debug: true, // Enable debug output
        logger: true // Enable internal logger
    };

    console.log('Nodemailer Config (sanitized):', {
        ...config,
        auth: { user: config.auth.user, pass: '***' }
    });

    const transporter = nodemailer.createTransport(config);

    try {
        const info = await transporter.sendMail({
            from: '"ZeCorp Test" <noreply@zecorp.ae>',
            to: 'arshadhahamed777@gmail.com',
            subject: 'ZeCorp Debug Test Email',
            html: '<h1>Debug Test</h1><p>Checking delivery with verbose logs.</p>'
        });
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

testEmail();
