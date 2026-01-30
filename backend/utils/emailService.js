const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this._createTransporter();
  }

  _createTransporter() {
    if (process.env.EMAIL_SERVICE === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      // Fallback to SMTP
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
  }

  async sendEmail(to, subject, htmlContent, attachments = []) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"Thajira WorkFlow" <noreply@thajiraworkflow.com>',
        to: to,
        subject: subject,
        html: htmlContent,
        attachments: attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw, just log. We don't want to break the queue worker.
      return { error: error.message };
    }
  }

  async sendTaskAssignmentEmail(userEmail, taskDetails, projectDetails) {
    const subject = `New Task Assigned: ${taskDetails.title}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Task Assigned</h2>
        <p>Hello,</p>
        <p>A new task has been assigned to you:</p>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${taskDetails.title}</h3>
          <p><strong>Project:</strong> ${projectDetails.projectName}</p>
          <p><strong>Deadline:</strong> ${new Date(taskDetails.deadline).toLocaleDateString()}</p>
          <p><strong>Priority:</strong> ${taskDetails.priority}</p>
          <p><strong>Description:</strong> ${taskDetails.description || 'No description provided'}</p>
        </div>

        <p>Please log in to the Thajira WorkFlow system to view and update this task.</p>
        <p>Thank you,<br/>Thajira WorkFlow Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendDailyReportEmail(userEmail, reportData) {
    const subject = `Your Daily Work Report - ${new Date().toLocaleDateString()}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Daily Work Report</h2>
        <p>Hello,</p>
        <p>Here's your daily work summary:</p>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Today's Summary</h3>
          <p><strong>Hours Worked:</strong> ${reportData.hoursWorked}</p>
          <p><strong>Overtime:</strong> ${reportData.overtimeHours}</p>
          <p><strong>Tasks Completed:</strong> ${reportData.tasksCompleted}</p>
          <p><strong>Tasks In Progress:</strong> ${reportData.tasksInProgress}</p>
          <p><strong>Tasks Overdue:</strong> ${reportData.tasksOverdue}</p>
        </div>

        <p>Keep up the good work!</p>
        <p>Thank you,<br/>Thajira WorkFlow Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, htmlContent);
  }
}

module.exports = new EmailService();