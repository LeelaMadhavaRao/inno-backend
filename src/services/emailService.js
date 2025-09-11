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

  // Send faculty invitation with designation-specific templates
  async sendFacultyInvitation({ facultyData, credentials }) {
    const { designation } = facultyData;
    const isHighRanking = ['HOD', 'Principal'].includes(designation);
    const frontendUrl = process.env.FRONTEND_URL || 'https://innoverse-csit.web.app';
    
    let subject, html;
    
    if (isHighRanking) {
      // Special template for HOD and Principal
      subject = `Innoverse 2025 - Distinguished ${designation} Portal Invitation`;
      html = this.generateHighRankingFacultyTemplate(facultyData, credentials, frontendUrl);
    } else {
      // Regular template for Assistant Professor and Professor
      subject = `Innoverse 2025 - Faculty Portal Invitation`;
      html = this.generateRegularFacultyTemplate(facultyData, credentials, frontendUrl);
    }

    return await this.sendEmail({
      to: facultyData.email,
      subject,
      html,
    });
  }

  // Template for HOD and Principal
  generateHighRankingFacultyTemplate(facultyData, credentials, frontendUrl) {
    const designationEmoji = facultyData.designation === 'Principal' ? '🎓👑' : '🏢📋';
    const honorificTitle = facultyData.designation === 'Principal' ? 'Esteemed Principal' : 'Respected HOD';
    
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        <!-- Header with Special Design -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #9b59b6 100%); padding: 40px 30px; text-align: center; color: white; position: relative;">
          <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
            ${designationEmoji}
          </div>
          <h1 style="margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Innoverse 2025</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Distinguished ${facultyData.designation} Portal Access</p>
          <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;"></div>
          <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.2;"></div>
        </div>
        
        <div style="padding: 40px 30px; background: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2c3e50; margin: 0; font-size: 26px;">Dear ${honorificTitle}, ${facultyData.name}! 🙏</h2>
            <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #3498db, #9b59b6); margin: 15px auto; border-radius: 2px;"></div>
          </div>
          
          <p style="color: #555; line-height: 1.8; font-size: 16px; text-align: center; margin-bottom: 30px;">
            It is our distinct honor to extend this special invitation to you as our esteemed <strong>${facultyData.designation}</strong>. 
            Your distinguished leadership in <strong>${facultyData.department}</strong> makes you an invaluable asset to Innoverse 2025.
          </p>

          <!-- VIP Access Credentials -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; margin: 30px 0; color: white; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
            <h3 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">🔐 Your VIP Portal Access</h3>
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 12px; backdrop-filter: blur(10px);">
              <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span style="background: rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 8px; margin-right: 15px; font-weight: bold;">🌐</span>
                <div>
                  <strong>Portal URL:</strong><br>
                  <a href="${frontendUrl}/login" style="color: #fff; text-decoration: none; font-size: 16px;">${frontendUrl}/login</a>
                </div>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span style="background: rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 8px; margin-right: 15px; font-weight: bold;">📧</span>
                <div>
                  <strong>Email:</strong><br>
                  <code style="background: rgba(255,255,255,0.3); padding: 4px 8px; border-radius: 6px; font-size: 14px;">${facultyData.email}</code>
                </div>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="background: rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 8px; margin-right: 15px; font-weight: bold;">🔑</span>
                <div>
                  <strong>Secure Password:</strong><br>
                  <code style="background: rgba(255,255,255,0.3); padding: 4px 8px; border-radius: 6px; font-size: 14px;">${credentials.password}</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Distinguished Profile -->
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 15px; padding: 25px; margin: 25px 0; color: white;">
            <h3 style="margin: 0 0 20px 0; font-size: 20px; text-align: center;">👑 Distinguished Profile</h3>
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px;">
              <p style="margin: 8px 0;"><strong>Name:</strong> ${facultyData.name}</p>
              <p style="margin: 8px 0;"><strong>Position:</strong> ${facultyData.designation}</p>
              <p style="margin: 8px 0;"><strong>Department:</strong> ${facultyData.department}</p>
              ${facultyData.specialization ? `<p style="margin: 8px 0;"><strong>Specialization:</strong> ${facultyData.specialization}</p>` : ''}
            </div>
          </div>

          <!-- Special Privileges -->
          <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 15px; padding: 25px; margin: 25px 0; color: #2c3e50;">
            <h3 style="margin: 0 0 20px 0; text-align: center;">✨ Your Special Privileges</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                <strong>Dashboard Access</strong>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                <strong>Team Monitoring</strong>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                <strong>Progress Reports</strong>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">⚙️</div>
                <strong>Admin Controls</strong>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
              ${designationEmoji} Access Distinguished Portal
            </a>
          </div>

          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
            <p>With highest regards,<br><strong>Innoverse 2025 Team</strong></p>
          </div>
        </div>
      </div>
    `;
  }

  // Template for regular faculty (Assistant Professor, Associate Professor, Professor)
  generateRegularFacultyTemplate(facultyData, credentials, frontendUrl) {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%); padding: 35px; text-align: center; color: white; position: relative;">
          <div style="background: rgba(255,255,255,0.15); border-radius: 50%; width: 70px; height: 70px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 35px;">
            🎓
          </div>
          <h1 style="margin: 0; font-size: 28px; text-shadow: 1px 1px 3px rgba(0,0,0,0.3);">Innoverse 2025 Faculty Portal</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Invitation to Guide Innovation</p>
        </div>
        
        <div style="padding: 35px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Dear ${facultyData.name}! 👋</h2>
          
          <p style="color: #666; line-height: 1.6; text-align: center; margin-bottom: 25px;">
            We are honored to invite you to be part of Innoverse 2025 as a faculty member. Your expertise in 
            <strong>${facultyData.specialization || facultyData.department}</strong> will be invaluable in guiding our participants.
          </p>

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: white;">
            <h3 style="color: white; margin-top: 0; text-align: center;">🔐 Your Faculty Portal Access</h3>
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 15px 0;">
              <p style="margin: 8px 0;"><strong>Portal URL:</strong> <a href="${frontendUrl}/login" style="color: #fff; text-decoration: none;">${frontendUrl}/login</a></p>
              <p style="margin: 8px 0;"><strong>Email:</strong> <code style="background: rgba(255,255,255,0.3); padding: 4px 8px; border-radius: 4px;">${facultyData.email}</code></p>
              <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background: rgba(255,255,255,0.3); padding: 4px 8px; border-radius: 4px;">${credentials.password}</code></p>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #333;">
            <h3 style="color: #333; margin-top: 0; text-align: center;">👤 Your Profile</h3>
            <div style="background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${facultyData.name}</p>
              <p style="margin: 5px 0;"><strong>Designation:</strong> ${facultyData.designation}</p>
              <p style="margin: 5px 0;"><strong>Department:</strong> ${facultyData.department}</p>
              ${facultyData.specialization ? `<p style="margin: 5px 0;"><strong>Specialization:</strong> ${facultyData.specialization}</p>` : ''}
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 8px 20px rgba(142, 45, 226, 0.3);">
              🎓 Access Faculty Portal
            </a>
          </div>

          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 25px;">
            <p>Best regards,<br><strong>Innoverse 2025 Team</strong></p>
          </div>
        </div>
      </div>
    `;
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
