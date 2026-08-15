const logger = require('../config/logger');
const env = require('../config/env');

// Real delivery requires real provider credentials (SMTP for email, Twilio for SMS).
// Without them, this DEV MODE fallback logs the message instead of silently pretending
// to send it — so nobody mistakes console output for a delivered email/SMS.

let transporterPromise = null;
function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporterPromise) {
    const nodemailer = requireOptional('nodemailer');
    if (!nodemailer) return null;
    transporterPromise = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporterPromise;
}

function requireOptional(name) {
  try { return require(name); } catch { return null; }
}

async function sendEmail({ to, subject, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`[DEV MODE — no SMTP configured] Email to ${to}: "${subject}" — ${text}`);
    return { delivered: false, mode: 'console' };
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  return { delivered: true, mode: 'smtp' };
}

async function sendSms({ to, text }) {
  if (env.sms.provider === 'twilio' && env.sms.twilio.accountSid) {
    const twilioLib = requireOptional('twilio');
    if (twilioLib) {
      const client = twilioLib(env.sms.twilio.accountSid, env.sms.twilio.authToken);
      await client.messages.create({ body: text, from: env.sms.twilio.fromNumber, to });
      return { delivered: true, mode: 'twilio' };
    }
  }
  logger.warn(`[DEV MODE — no SMS provider configured] SMS to ${to}: ${text}`);
  return { delivered: false, mode: 'console' };
}

module.exports = { sendEmail, sendSms };
