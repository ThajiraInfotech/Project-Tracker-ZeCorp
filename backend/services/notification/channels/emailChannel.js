const emailService = require('../../../utils/emailService');

const send = async (recipient, templateData) => {
  try {
    if (!recipient || !recipient.email) {
      console.warn(`[EmailChannel] Skipped — user "${recipient?.username || 'unknown'}" has no email address`);
      return false;
    }

    console.log(`[EmailChannel] Sending "${templateData.type}" email to ${recipient.email}`);

    // Enterprise Brand Colors - ZeCorp Theme
    const BRAND_COLOR = '#700606'; // Deep Red
    const BG_COLOR = '#f8fafc';
    const TEXT_COLOR = '#334155'; // Keep body text readable
    const SUBTLE_TEXT = '#a1a1a1'; // User requested grey

    // Determine content based on templateData
    let subject = templateData.subject || 'Notification from ZeCorp';
    let contentBody = '';

    // Advanced Template Logic
    if (templateData.type === 'USER_CREATED') {
      subject = 'Welcome to ZeCorp Solutions - Your Account Details';
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
            <!-- Logo Section -->
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>

            <h1 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 20px; text-align: center;">
              Welcome, ${recipient.fullName}!
            </h1>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px; text-align: center;">
              You have been successfully added to the <strong>ZeCorp Solutions Enterprise Project & Task Management</strong> portal.
            </p>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px; text-align: center;">
              Here are your login credentials to get started.
            </p>
            
            <!-- Credentials Box -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
              <tr>
                <td style="background-color: #fff5f5; border: 1px solid ${BRAND_COLOR}; border-radius: 4px; padding: 20px; text-align: center;">
                  <p style="margin: 0 0 5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: ${SUBTLE_TEXT}; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Username</p>
                  <p style="margin: 0 0 20px; font-family: 'Courier New', Courier, monospace; font-size: 18px; color: #333; font-weight: 700;">${templateData.username}</p>
                  
                  <p style="margin: 0 0 5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: ${SUBTLE_TEXT}; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Password</p>
                  <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 18px; color: #333; font-weight: 700;">${templateData.password}</p>
                </td>
              </tr>
            </table>

            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${process.env.FRONTEND_URL}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: ${BRAND_COLOR}; font-weight: bold;">
                    Access Portal
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    } else if (templateData.type === 'PROJECT_ASSIGNED') {
      subject = `New Project Assignment: ${templateData.entityTitle}`;
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 20px; text-align: center;">
              Project Manager Assignment
            </h1>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px;">
              Hello <strong>${recipient.fullName}</strong>,<br><br>
              You have been assigned as the <strong>Project Manager</strong> for a new project.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 15px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Project Name</p>
                  <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 700;">${templateData.entityTitle}</p>
                </td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}${templateData.relatedLink}" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Project Dashboard</a>
            </div>
          </td>
        </tr>
      `;
    } else if (templateData.type === 'ADDED_TO_TEAM') {
      subject = `Added to Project Team: ${templateData.entityTitle}`;
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 20px; text-align: center;">
              New Team Assignment
            </h1>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px;">
              Hello <strong>${recipient.fullName}</strong>,<br><br>
              You have been added to the team for <strong>${templateData.entityTitle}</strong>.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}${templateData.relatedLink}" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Project</a>
            </div>
          </td>
        </tr>
      `;
    } else if (templateData.type === 'TASK_ASSIGNED') {
      subject = `New Task Assigned: ${templateData.entityTitle}`;
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 20px; text-align: center;">
              New Task Assignment
            </h1>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px;">
              Hello <strong>${recipient.fullName}</strong>,<br><br>
              A new task has been assigned to you.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Task Title</p>
                  <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 700;">${templateData.entityTitle}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 15px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Project</p>
                  <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 600;">${templateData.project ? templateData.project.projectName : 'N/A'}</p>
                </td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}${templateData.relatedLink}" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Task Details</a>
            </div>
          </td>
        </tr>
      `;
    } else if (templateData.type === 'TASK_SUPERVISOR_ADDED') {
      subject = `Supervisor Assignment: ${templateData.entityTitle}`;
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>
            <h1 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 20px; text-align: center;">
              Supervisor Assignment
            </h1>
            <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555; margin: 0 0 20px;">
              Hello <strong>${recipient.fullName || recipient.username}</strong>,<br><br>
              You have been assigned as the <strong>Supervisor (CC)</strong> for a task.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Task Title</p>
                  <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 700;">${templateData.entityTitle}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 15px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Project</p>
                  <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 600;">${templateData.project ? (templateData.project.projectName || templateData.project) : 'N/A'}</p>
                </td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}${templateData.relatedLink}" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Task Details</a>
            </div>
          </td>
        </tr>
      `;
    } else {
      // Generic Notification Template
      contentBody = `
        <tr>
          <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 8px;">
             <!-- Logo Section -->
            <div style="text-align: center; margin-bottom: 20px;">
               <img src="${process.env.FRONTEND_URL}/zecorp_logo.png" alt="ZeCorp Logo" style="max-width: 150px; height: auto;" />
            </div>
             <h2 style="color: ${BRAND_COLOR}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0 0 20px; text-align: center;">
               ${templateData.subject || 'New Notification'}
             </h2>
             <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555;">
               ${templateData.message}
             </p>
             <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.FRONTEND_URL}${templateData.link || ''}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: bold; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                  View Details &rarr;
                </a>
             </div>
          </td>
        </tr>
      `;
    }

    // Outer Wrapper
    const finalHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${BG_COLOR};">
        <center>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${BG_COLOR}; padding: 20px;">
            <!-- Content -->
            ${contentBody}
            
            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 30px 0 20px;">
                <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: ${SUBTLE_TEXT}; margin: 0;">
                  &copy; ${new Date().getFullYear()} ZeCorp Solutions. All rights reserved.<br>
                  Secure Enterprise Project & Task Management System
                </p>
              </td>
            </tr>
          </table>
        </center>
      </body>
      </html>
    `;

    await emailService.sendEmail(recipient.email, subject, finalHtml);
    return true;
  } catch (error) {
    console.error('EmailChannel Error:', error);
    return false;
  }
};

module.exports = { send };
