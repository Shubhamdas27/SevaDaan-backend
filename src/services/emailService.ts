import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `SevaDaan <${config.email.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.to}: ${info.messageId}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d5aa0;">Welcome to SevaDaan!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for joining SevaDaan, your platform for making a difference.</p>
      <p>You can now:</p>
      <ul>
        <li>Explore verified NGOs in your area</li>
        <li>Volunteer for causes you care about</li>
        <li>Donate to impactful programs</li>
        <li>Track your contributions</li>
      </ul>
      <p>Together, we can create positive change in our communities.</p>
      <p>Best regards,<br>The SevaDaan Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to SevaDaan - Make a Difference Today!',
    html
  });
};

export const sendNGOVerificationEmail = async (
  email: string, 
  ngoName: string, 
  status: 'verified' | 'rejected',
  notes?: string
): Promise<void> => {
  const isApproved = status === 'verified';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${isApproved ? '#28a745' : '#dc3545'};">
        NGO Registration ${isApproved ? 'Approved' : 'Rejected'}
      </h2>
      <p>Dear ${ngoName} Team,</p>
      <p>
        ${isApproved 
          ? `Congratulations! Your NGO registration has been approved. You can now access your dashboard and start creating programs.`
          : `We regret to inform you that your NGO registration has been rejected.`
        }
      </p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      ${isApproved 
        ? `<p>You can now:</p>
           <ul>
             <li>Create and manage programs</li>
             <li>Receive donations</li>
             <li>Post volunteer opportunities</li>
             <li>Update your organization profile</li>
           </ul>`
        : `<p>If you believe this is an error or would like to reapply, please contact our support team.</p>`
      }
      <p>Best regards,<br>The SevaDaan Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `NGO Registration ${isApproved ? 'Approved' : 'Rejected'} - ${ngoName}`,
    html
  });
};

export const sendDonationReceiptEmail = async (
  email: string,
  donorName: string,
  ngoName: string,
  amount: number,
  donationId: string,
  receiptUrl?: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Thank You for Your Donation!</h2>
      <p>Dear ${donorName},</p>
      <p>Thank you for your generous donation to ${ngoName}.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Donation Details:</h3>
        <p><strong>NGO:</strong> ${ngoName}</p>
        <p><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
        <p><strong>Donation ID:</strong> ${donationId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      ${receiptUrl ? `<p><a href="${receiptUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Receipt</a></p>` : ''}
      <p>Your contribution makes a real difference in the lives of those we serve.</p>
      <p>Best regards,<br>The SevaDaan Team</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Donation Receipt - ₹${amount.toLocaleString()} to ${ngoName}`,
    html
  });
};
