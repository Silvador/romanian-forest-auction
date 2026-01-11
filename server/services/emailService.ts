import { Resend } from 'resend';
import { render } from '@react-email/render';
import type { ReactElement } from 'react';

/**
 * EmailService - Centralized email sending service using Resend
 *
 * Configuration:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_FROM_EMAIL: Sender email (e.g., notificari@yourdomain.com)
 * - RESEND_FROM_NAME: Sender name (e.g., "Silvador - Licitatii Forestiere")
 */

interface EmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'notificari@roforest.ro';
    this.fromName = process.env.RESEND_FROM_NAME || 'RoForest - Licitatii Forestiere';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      console.log('✅ EmailService initialized successfully');
    } else {
      console.warn('⚠️  RESEND_API_KEY not found - Email notifications disabled');
      console.warn('   Add RESEND_API_KEY to your .env file to enable email notifications');
    }
  }

  /**
   * Send an email using a React email template
   * @param options Email options including recipient, subject, and React component
   * @returns Promise resolving to send result or null if email service is not configured
   */
  async sendEmail(options: EmailOptions): Promise<{ id: string } | null> {
    if (!this.isConfigured || !this.resend) {
      console.warn(`⚠️  Email service not configured - skipping email to ${options.to}`);
      return null;
    }

    try {
      const html = render(options.react);

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html,
      });

      if ('error' in result) {
        console.error('❌ Resend API error:', result.error);
        return null;
      }

      console.log(`✅ Email sent successfully to ${options.to} (ID: ${result.data?.id})`);
      return { id: result.data?.id || '' };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return null;
    }
  }

  /**
   * Send a welcome email to a new user
   * @param to Recipient email address
   * @param userName User's display name
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const { WelcomeEmail } = await import('../emails/WelcomeEmail');

    await this.sendEmail({
      to,
      subject: 'Bun venit pe RoForest - Licitații Forestiere',
      react: WelcomeEmail({ userName, userEmail: to }),
    });
  }

  /**
   * Send an outbid notification email
   * @param to Recipient email address
   * @param userName User's display name
   * @param auctionTitle Title of the auction
   * @param yourBid User's current bid amount
   * @param newHighBid The new highest bid amount
   * @param auctionId ID of the auction (for linking)
   */
  async sendOutbidEmail(
    to: string,
    userName: string,
    auctionTitle: string,
    yourBid: number,
    newHighBid: number,
    auctionId: string
  ): Promise<void> {
    const { OutbidEmail } = await import('../emails/OutbidEmail');
    const baseUrl = process.env.BASE_URL || 'https://roforest.ro';
    const auctionUrl = `${baseUrl}/auction/${auctionId}`;

    await this.sendEmail({
      to,
      subject: `Ai fost depășit la licitația pentru ${auctionTitle}`,
      react: OutbidEmail({ userName, auctionTitle, yourBid, newHighBid, auctionUrl }),
    });
  }

  /**
   * Send an auction won notification email
   * @param to Recipient email address
   * @param userName User's display name
   * @param auctionTitle Title of the auction
   * @param winningBid The winning bid amount
   * @param auctionId ID of the auction (for linking)
   */
  async sendWonAuctionEmail(
    to: string,
    userName: string,
    auctionTitle: string,
    winningBid: number,
    auctionId: string
  ): Promise<void> {
    const { WonAuctionEmail } = await import('../emails/WonAuctionEmail');
    const baseUrl = process.env.BASE_URL || 'https://roforest.ro';
    const auctionUrl = `${baseUrl}/auction/${auctionId}`;

    await this.sendEmail({
      to,
      subject: `Felicitări! Ai câștigat licitația pentru ${auctionTitle}`,
      react: WonAuctionEmail({ userName, auctionTitle, winningBid, auctionUrl }),
    });
  }

  /**
   * Send an auction ending soon notification email
   * @param to Recipient email address
   * @param userName User's display name
   * @param auctionTitle Title of the auction
   * @param currentBid Current highest bid
   * @param hoursLeft Hours remaining until auction ends
   * @param auctionId ID of the auction (for linking)
   * @param isLeading Whether the user is currently leading the auction
   */
  async sendAuctionEndingEmail(
    to: string,
    userName: string,
    auctionTitle: string,
    currentBid: number,
    hoursLeft: number,
    auctionId: string,
    isLeading: boolean = false
  ): Promise<void> {
    const { AuctionEndingEmail } = await import('../emails/AuctionEndingEmail');
    const baseUrl = process.env.BASE_URL || 'https://roforest.ro';
    const auctionUrl = `${baseUrl}/auction/${auctionId}`;

    await this.sendEmail({
      to,
      subject: `Licitația pentru ${auctionTitle} se încheie în curând!`,
      react: AuctionEndingEmail({ userName, auctionTitle, currentBid, hoursLeft, auctionUrl, isLeading }),
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();
