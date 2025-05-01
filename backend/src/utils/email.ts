import nodemailer from 'nodemailer';
import env from '../config/env';
import { logger } from './logger';

// Email configuration
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    logger.info('Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error(`Email configuration verification failed: ${error}`);
    return false;
  }
};

// Interface for email options
interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

// Send email
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email: ${error}`);
    return false;
  }
};

// Email templates
export const emailTemplates = {
  // Welcome email
  welcome: (name: string, verificationLink: string): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Calendly Clone!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up. We're excited to have you on board!</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${verificationLink}</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Password reset email
  passwordReset: (name: string, resetLink: string): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        <p>To reset your password, click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Booking confirmation email for host
  bookingConfirmationHost: (
    hostName: string,
    eventName: string,
    inviteeName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    location: string,
    additionalInfo?: Record<string, string>
  ): string => {
    let additionalInfoHtml = '';
    if (additionalInfo) {
      additionalInfoHtml = '<h3>Additional Information</h3><ul>';
      for (const [key, value] of Object.entries(additionalInfo)) {
        additionalInfoHtml += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      additionalInfoHtml += '</ul>';
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Booking Confirmed</h2>
        <p>Hello ${hostName},</p>
        <p>A new booking has been confirmed for your event:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${eventName}</h3>
          <p><strong>With:</strong> ${inviteeName}</p>
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
          <p><strong>Where:</strong> ${location}</p>
        </div>
        ${additionalInfoHtml}
        <p>You can manage this booking from your dashboard.</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Booking confirmation email for invitee
  bookingConfirmationInvitee: (
    inviteeName: string,
    hostName: string,
    eventName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    location: string,
    cancelLink?: string,
    rescheduleLink?: string
  ): string => {
    let actionButtons = '';
    if (cancelLink || rescheduleLink) {
      actionButtons = '<div style="margin: 30px 0;">';
      if (rescheduleLink) {
        actionButtons += `<a href="${rescheduleLink}" style="background-color: #0069ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Reschedule</a>`;
      }
      if (cancelLink) {
        actionButtons += `<a href="${cancelLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Cancel</a>`;
      }
      actionButtons += '</div>';
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmed</h2>
        <p>Hello ${inviteeName},</p>
        <p>Your booking has been confirmed:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${eventName}</h3>
          <p><strong>With:</strong> ${hostName}</p>
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
          <p><strong>Where:</strong> ${location}</p>
        </div>
        ${actionButtons}
        <p>If you have any questions, please contact ${hostName}.</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Booking cancellation email for host
  bookingCancellationHost: (
    hostName: string,
    eventName: string,
    inviteeName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    cancellationReason?: string
  ): string => {
    let reasonHtml = '';
    if (cancellationReason) {
      reasonHtml = `<p><strong>Reason for cancellation:</strong> ${cancellationReason}</p>`;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Cancelled</h2>
        <p>Hello ${hostName},</p>
        <p>A booking has been cancelled:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${eventName}</h3>
          <p><strong>With:</strong> ${inviteeName}</p>
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
          ${reasonHtml}
        </div>
        <p>This time slot is now available for new bookings.</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Booking cancellation email for invitee
  bookingCancellationInvitee: (
    inviteeName: string,
    hostName: string,
    eventName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    rebookLink?: string
  ): string => {
    let rebookButton = '';
    if (rebookLink) {
      rebookButton = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${rebookLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Book Another Time</a>
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Cancelled</h2>
        <p>Hello ${inviteeName},</p>
        <p>Your booking has been cancelled:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${eventName}</h3>
          <p><strong>With:</strong> ${hostName}</p>
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
        </div>
        ${rebookButton}
        <p>If you have any questions, please contact ${hostName}.</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Booking reminder email
  bookingReminder: (
    name: string,
    eventName: string,
    otherPersonName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    location: string,
    isHost: boolean
  ): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Upcoming Meeting Reminder</h2>
        <p>Hello ${name},</p>
        <p>This is a reminder about your upcoming meeting:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${eventName}</h3>
          <p><strong>${isHost ? 'With' : 'Host'}:</strong> ${otherPersonName}</p>
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
          <p><strong>Where:</strong> ${location}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Team invitation email
  teamInvitation: (
    inviteeName: string,
    teamName: string,
    inviterName: string,
    inviteLink: string
  ): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invitation</h2>
        <p>Hello ${inviteeName},</p>
        <p>${inviterName} has invited you to join the team "${teamName}" on Calendly Clone.</p>
        <p>To accept this invitation, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${inviteLink}</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Meeting poll invitation email
  meetingPollInvitation: (
    inviteeName: string,
    creatorName: string,
    pollName: string,
    pollDescription: string,
    pollLink: string
  ): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Meeting Poll Invitation</h2>
        <p>Hello ${inviteeName},</p>
        <p>${creatorName} has invited you to vote on a meeting poll: "${pollName}"</p>
        ${pollDescription ? `<p><strong>Description:</strong> ${pollDescription}</p>` : ''}
        <p>Please click the button below to view the available options and cast your vote:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pollLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Vote Now</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${pollLink}</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  },

  // Meeting poll finalized email
  meetingPollFinalized: (
    participantName: string,
    creatorName: string,
    pollName: string,
    startTime: string,
    endTime: string,
    timezone: string,
    addToCalendarLink?: string
  ): string => {
    let calendarButton = '';
    if (addToCalendarLink) {
      calendarButton = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${addToCalendarLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Add to Calendar</a>
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Meeting Time Finalized</h2>
        <p>Hello ${participantName},</p>
        <p>${creatorName} has finalized the time for "${pollName}":</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <p><strong>When:</strong> ${startTime} - ${endTime} (${timezone})</p>
        </div>
        ${calendarButton}
        <p>We look forward to seeing you at the meeting!</p>
        <p>Best regards,<br>The Calendly Clone Team</p>
      </div>
    `;
  }
};