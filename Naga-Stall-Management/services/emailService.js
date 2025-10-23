const Database = require('../../database/database');
const nodemailer = require('nodemailer');

/**
 * Email Service for Employee Management
 * Handles sending welcome emails, password reset notifications, and other employee communications
 */

class EmailService {
    constructor() {
        this.db = new Database();
        this.transporter = this.createTransporter();
        this.baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@nagastallmanagement.com';
        this.fromName = process.env.FROM_NAME || 'Naga Stall Management System';
    }

    /**
     * Create email transporter
     * Configure this based on your email service (Gmail, SendGrid, etc.)
     */
    createTransporter() {
        // For development - Log emails to console
        if (process.env.NODE_ENV === 'development') {
            return {
                sendMail: async (mailOptions) => {
                    console.log('\n=== EMAIL SIMULATION ===');
                    console.log('To:', mailOptions.to);
                    console.log('Subject:', mailOptions.subject);
                    console.log('Text Content:', mailOptions.text);
                    console.log('========================\n');
                    return { messageId: 'simulated-' + Date.now() };
                }
            };
        }

        // For production - Configure with real SMTP
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Get email template from database
     */
    async getEmailTemplate(templateName) {
        try {
            const templates = await this.db.query(
                'SELECT * FROM employee_email_template WHERE template_name = ? AND is_active = true',
                [templateName]
            );

            if (templates.length === 0) {
                throw new Error(`Email template '${templateName}' not found`);
            }

            return templates[0];
        } catch (error) {
            console.error('Error getting email template:', error);
            throw error;
        }
    }

    /**
     * Replace template variables with actual values
     */
    replaceTemplateVariables(content, variables) {
        let processedContent = content;

        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = variables[key] || '';
            processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
        });

        return processedContent;
    }

    /**
     * Send welcome email to new employee with credentials
     */
    async sendEmployeeWelcomeEmail(employeeData) {
        try {
            const { email, firstName, lastName, username, password, branchName, createdBy } = employeeData;

            // Get email template
            const template = await this.getEmailTemplate('welcome_employee');

            // Prepare template variables
            const variables = {
                firstName,
                lastName,
                username,
                password,
                loginUrl: `${this.baseUrl}/employee/login`,
                branchName: branchName || 'Unknown Branch',
                createdBy: createdBy || 'System Administrator'
            };

            // Process template content
            const htmlContent = this.replaceTemplateVariables(template.html_content, variables);
            const textContent = this.replaceTemplateVariables(template.text_content, variables);
            const subject = this.replaceTemplateVariables(template.subject, variables);

            // Email options
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            // Send email
            const result = await this.transporter.sendMail(mailOptions);

            console.log(`Welcome email sent to ${email} for employee ${firstName} ${lastName}`);
            return {
                success: true,
                messageId: result.messageId,
                recipient: email
            };

        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    }

    /**
     * Send password reset email to employee
     */
    async sendEmployeePasswordResetEmail(resetData) {
        try {
            const { email, firstName, lastName, username, password, resetBy, resetDate } = resetData;

            // Get email template
            const template = await this.getEmailTemplate('password_reset');

            // Prepare template variables
            const variables = {
                firstName,
                lastName,
                username,
                password,
                loginUrl: `${this.baseUrl}/employee/login`,
                resetBy: resetBy || 'System Administrator',
                resetDate: resetDate || new Date().toLocaleString()
            };

            // Process template content
            const htmlContent = this.replaceTemplateVariables(template.html_content, variables);
            const textContent = this.replaceTemplateVariables(template.text_content, variables);
            const subject = this.replaceTemplateVariables(template.subject, variables);

            // Email options
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            // Send email
            const result = await this.transporter.sendMail(mailOptions);

            console.log(`Password reset email sent to ${email} for employee ${firstName} ${lastName}`);
            return {
                success: true,
                messageId: result.messageId,
                recipient: email
            };

        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }

    /**
     * Send custom notification email to employee
     */
    async sendEmployeeNotification(notificationData) {
        try {
            const { email, subject, message, employeeName } = notificationData;

            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: email,
                subject: `[Naga Stall Management] ${subject}`,
                text: `Hello ${employeeName},\n\n${message}\n\nBest regards,\nNaga Stall Management Team`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                            <h2>Naga Stall Management</h2>
                        </div>
                        <div style="padding: 30px; background: #f9f9f9;">
                            <p>Hello ${employeeName},</p>
                            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                            <p>Best regards,<br>Naga Stall Management Team</p>
                        </div>
                    </div>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);

            console.log(`Notification email sent to ${email}: ${subject}`);
            return {
                success: true,
                messageId: result.messageId,
                recipient: email
            };

        } catch (error) {
            console.error('Error sending notification email:', error);
            throw error;
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfiguration() {
        try {
            const testEmail = {
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                username: 'EMP1234',
                password: 'TestPass123',
                branchName: 'Test Branch',
                createdBy: 'Test Manager'
            };

            // This will log to console in development mode
            await this.sendEmployeeWelcomeEmail(testEmail);

            return {
                success: true,
                message: 'Email configuration test completed successfully'
            };

        } catch (error) {
            console.error('Email configuration test failed:', error);
            return {
                success: false,
                message: 'Email configuration test failed',
                error: error.message
            };
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;