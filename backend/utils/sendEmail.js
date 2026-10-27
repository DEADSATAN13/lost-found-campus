import nodemailer from 'nodemailer';

/**
 * Array storing captured outgoing emails during test runs.
 * Exported so integration tests can assert email delivery and content.
 */
export const testInbox = [];

/**
 * Clears test inbox between test cases.
 */
export function clearTestInbox() {
  testInbox.length = 0;
}

/**
 * Multi-mode email dispatcher:
 * - Test mode (NODE_ENV=test): queues email in memory
 * - Mode 1 (Brevo HTTPS API): avoids Render's outbound SMTP block
 * - Mode 2 (Gmail via Nodemailer): for local development
 * - Mode 3 (Console Fallback): prints email body to stdout
 *
 * Always returns { sent: boolean, mode: string } and never throws.
 */
export async function sendEmail({ to, subject, text, html }) {
  try {
    // In test environment, push to in-memory mailbox
    if (process.env.NODE_ENV === 'test') {
      testInbox.push({ to, subject, text, html, timestamp: new Date() });
      return { sent: true, mode: 'test' };
    }

    // Mode 1: Brevo HTTPS REST API (Render-friendly)
    if (process.env.BREVO_API_KEY) {
      const fromEmail = process.env.EMAIL_FROM || 'noreply@foundcampus.org';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: 'Found. Campus Board' },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html || `<p>${String(text || '').replace(/\n/g, '<br>')}</p>`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Brevo API error (${response.status}):`, errorText);
        return { sent: false, mode: 'brevo' };
      }

      return { sent: true, mode: 'brevo' };
    }

    // Mode 2: Gmail SMTP via Nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Found. Campus Board" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || `<p>${String(text || '').replace(/\n/g, '<br>')}</p>`,
      });

      return { sent: true, mode: 'gmail' };
    }

    // Mode 3: Console fallback
    console.log('\n================== [EMAIL FALLBACK] ==================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body:');
    console.log(text);
    console.log('======================================================\n');
    return { sent: true, mode: 'console' };
  } catch (error) {
    // Email failure must never crash the caller or abort API flows
    console.error('Failed to send email:', error.message);
    return { sent: false, mode: 'error' };
  }
}
