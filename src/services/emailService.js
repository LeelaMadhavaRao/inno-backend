import nodemailer from 'nodemailer';
import EmailTemplate from '../models/emailTemplate.model.js';

class EmailService {
  constructor() {
    console.log('🔧 Email service configuration:');
    console.log('  HOST:', process.env.EMAIL_HOST);
    console.log('  PORT:', process.env.EMAIL_PORT);
    console.log('  USER:', process.env.EMAIL_USER);
    console.log('  PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    console.log('  PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail service directly
      host: 'smtp.gmail.com', // Explicitly set Gmail SMTP
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Additional Gmail-specific settings
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('📧 Nodemailer transporter created successfully');
  }

  // Generic email sending method
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `"Innoverse 2025" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send team invitation with credentials
  async sendTeamInvitation({ teamData, credentials }) {
    const subject = `Welcome to Innoverse 2025 - Team "${teamData.teamName}" Credentials`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://innoverse-csit.web.app';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🚀 Welcome to Innoverse 2025!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your Startup Journey Begins Now</p>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${teamData.teamLeader.name}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Congratulations! Your team "<strong>${teamData.teamName}</strong>" has been successfully registered for Innoverse 2025. 
            We're excited to see your innovative ideas come to life!
          </p>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">🔐 Your Login Credentials</h3>
            <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="${frontendUrl}/login" style="color: #667eea;">${frontendUrl}/login</a></p>
              <p style="margin: 5px 0;"><strong>Username:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${credentials.username}</code></p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${credentials.password}</code></p>
            </div>
            <p style="color: #d73027; font-size: 14px; margin: 10px 0;">
              ⚠️ Please change your password after your first login for security purposes.
            </p>
          </div>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">👥 Team Details</h3>
            <p><strong>Team Name:</strong> ${teamData.teamName}</p>
            <p><strong>Team Leader:</strong> ${teamData.teamLeader.name}</p>
            <p><strong>Team Size:</strong> ${teamData.teamMembers.length + 1} members</p>
            <p><strong>Contact:</strong> ${teamData.teamLeader.email}</p>
            
            <div style="margin-top: 15px;">
              <h4 style="color: #555; margin-bottom: 10px;">Team Members:</h4>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>Team Leader:</strong> ${teamData.teamLeader.name} (${teamData.teamLeader.email})</p>
                ${teamData.teamMembers && teamData.teamMembers.length > 0 
                  ? teamData.teamMembers.map((member, index) => 
                      `<p style="margin: 5px 0;"><strong>Member ${index + 1}:</strong> ${member.name} (${member.email ? member.email : 'No email provided'})</p>`
                    ).join('') 
                  : '<p style="margin: 5px 0; color: #666; font-style: italic;">No additional team members listed</p>'
                }
              </div>
            </div>
          </div>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">📋 What's Next?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Log in to your team portal using the credentials above</li>
              <li>Complete your team profile and project details</li>
              <li>Upload your team photo and project materials</li>
              <li>Stay tuned for evaluation schedules and event updates</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              🚀 Access Team Portal
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #999; font-size: 14px;">
            <p>Need help? Contact us at <a href="mailto:admin@innoverse.com" style="color: #667eea;">admin@innoverse.com</a></p>
            <p>This email was sent by the Innoverse 2025 Admin Team</p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: teamData.teamLeader.email,
      subject,
      html,
    });
  }

  // Send faculty invitation
  async sendFacultyInvitation({ facultyData, credentials }) {
    const subject = `Innoverse 2025 - Faculty Portal Invitation`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://innoverse-csit.web.app';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎓 Innoverse 2025 Faculty Portal</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your Invitation to Guide Innovation</p>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${facultyData.name}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We are honored to invite you to be part of Innoverse 2025 as a faculty member. Your expertise in 
            <strong>${facultyData.specialization || facultyData.department}</strong> will be invaluable in guiding our participants.
          </p>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #8e2de2;">
            <h3 style="color: #8e2de2; margin-top: 0;">🔐 Your Faculty Portal Access</h3>
            <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="${frontendUrl}/login" style="color: #8e2de2;">${frontendUrl}/login</a></p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${facultyData.email}</code></p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${credentials.password}</code></p>
            </div>
          </div>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">👤 Your Profile</h3>
            <p><strong>Name:</strong> ${facultyData.name}</p>
            <p><strong>Department:</strong> ${facultyData.department}</p>
            <p><strong>Designation:</strong> ${facultyData.designation}</p>
            ${facultyData.specialization ? `<p><strong>Specialization:</strong> ${facultyData.specialization}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              🎓 Access Faculty Portal
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: facultyData.email,
      subject,
      html,
    });
  }

  // Send evaluator invitation
  async sendEvaluatorInvitation({ evaluatorData, credentials }) {
    const subject = `Innoverse 2025 - Evaluator Portal Invitation`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://innoverse-csit.web.app';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">👨‍⚖️ Innoverse 2025 Evaluator Portal</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Join Us in Discovering Tomorrow's Innovations</p>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${evaluatorData.name}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We are delighted to invite you as an evaluator for Innoverse 2025. Your expertise from 
            <strong>${evaluatorData.organization}</strong> will help us identify and nurture the most promising innovations.
          </p>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #1e3c72;">
            <h3 style="color: #1e3c72; margin-top: 0;">🔐 Your Evaluator Portal Access</h3>
            <div style="background: #f1f3f4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="${frontendUrl}/login" style="color: #1e3c72;">${frontendUrl}/login</a></p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${evaluatorData.email}</code></p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px;">${credentials.password}</code></p>
            </div>
          </div>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">👤 Your Profile</h3>
            <p><strong>Name:</strong> ${evaluatorData.name}</p>
            <p><strong>Organization:</strong> ${evaluatorData.organization}</p>
            <p><strong>Type:</strong> ${evaluatorData.type} Evaluator</p>
            ${evaluatorData.expertise ? `<p><strong>Expertise:</strong> ${evaluatorData.expertise}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://innoverse-csit.web.app/login" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              👨‍⚖️ Access Evaluator Portal
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: evaluatorData.email,
      subject,
      html,
    });
  }

  // Send evaluation reminder
  async sendEvaluationReminder({ evaluatorEmail, evaluatorName, pendingTeams }) {
    const subject = `Innoverse 2025 - Evaluation Reminder`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://innoverse-csit.web.app';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Evaluation Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Pending Team Evaluations</p>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${evaluatorName}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6;">
            You have <strong>${pendingTeams.length}</strong> team evaluations pending. Please complete them at your earliest convenience.
          </p>

          <div style="background: white; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">📋 Pending Teams</h3>
            <ul style="color: #666; line-height: 1.8;">
              ${pendingTeams.map(team => `<li><strong>${team.teamName}</strong> - ${team.memberCount} members</li>`).join('')}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              📝 Complete Evaluations
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: evaluatorEmail,
      subject,
      html,
    });
  }
}

// Export the class, not an instance
export default EmailService;
