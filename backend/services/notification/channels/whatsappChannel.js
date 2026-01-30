const twilio = require('twilio');

let client = null;

const initClient = () => {
    if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return client;
};

const send = async (recipient, message) => {
    try {
        const twilioClient = initClient();
        if (!twilioClient) {
            console.warn('WhatsAppChannel: Twilio not configured (Skipping)');
            return false; // Not an error, just skipping
        }

        if (!recipient.phone) {
            console.warn(`WhatsAppChannel: User ${recipient.username} has no phone number`);
            return false;
        }

        const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Sandbox default
        const to = `whatsapp:${recipient.phone}`;

        await twilioClient.messages.create({
            body: message,
            from: from,
            to: to
        });

        console.log(`WhatsApp sent to ${recipient.username}`);
        return true;
    } catch (error) {
        console.error('WhatsAppChannel Error:', error.message);
        return false;
    }
};

module.exports = { send };
