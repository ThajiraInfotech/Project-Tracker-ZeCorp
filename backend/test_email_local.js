require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
    console.log('Testing Email Service...');
    console.log(`Service: ${process.env.EMAIL_SERVICE}`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    console.log(`Password Length: ${process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0}`);
    console.log(`Password: |${process.env.EMAIL_PASSWORD}|`); // Debug to see if spaces are preserved

    try {
        const result = await emailService.sendEmail(
            process.env.EMAIL_USER, // Send to self
            'Test Email from Zeecorp Local',
            '<h1>It Works!</h1><p>This is a test to verify credentials.</p>'
        );

        if (result.error) {
            console.error('❌ Email Failed:', result.error);
        } else {
            console.log('✅ Email Sent Successfully!', result.messageId);
        }
    } catch (error) {
        console.error('❌ Exception:', error);
    }
}

testEmail();
