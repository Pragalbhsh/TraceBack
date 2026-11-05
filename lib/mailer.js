// Email alerts. If SMTP isn't configured the email is printed to the console instead,
// so the matching flow can still be tried out locally.
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
if (config.mail.enabled) {
    transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
}

const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function send({ to, subject, text, html }) {
    if (!transporter) {
        if (!config.isTest) console.log(`📧 [email not sent - SMTP not configured]\n   To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, '\n   ')}`);
        return { skipped: true };
    }
    return transporter.sendMail({ from: config.mail.from, to, subject, text, html });
}

/**
 * Tell `recipient` that `newItem` (just posted by someone else) may match their item `theirItem`.
 */
function matchAlert({ recipient, theirItem, newItem, match }) {
    const link = `${config.clientUrl}/item/${newItem._id}`;
    const what = newItem.type === 'found' ? 'Someone found something that might be yours' : 'Someone is looking for something you found';
    const subject = `TraceBack: possible match for "${theirItem.name}"`;
    const reasons = (match.reasons || []).map((r) => `• ${r}`).join('\n');
    const text = `Hi ${recipient.name},

${what}.

Your post: ${theirItem.name} (${theirItem.type})
New post:  ${newItem.name} - ${newItem.location}

Why we think it matches:
${reasons}

See it and get in touch: ${link}

Stay safe: meet in a public place, and ask the other person to describe something only the owner would know.

You can turn these emails off from "My posts" on TraceBack.`;

    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#1f2937">
  <h2 style="color:#4f46e5;margin:0 0 12px">${escapeHtml(what)}</h2>
  <p>Hi ${escapeHtml(recipient.name)},</p>
  <p>A new post on TraceBack looks like it could match <strong>${escapeHtml(theirItem.name)}</strong>.</p>
  <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin:14px 0">
    <div style="font-size:12px;text-transform:uppercase;color:#6b7280">${escapeHtml(newItem.type)}</div>
    <div style="font-size:18px;font-weight:600">${escapeHtml(newItem.name)}</div>
    <div style="color:#4b5563">📍 ${escapeHtml(newItem.location)}</div>
    <ul style="padding-left:18px;color:#374151">${(match.reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
  </div>
  <p><a href="${escapeHtml(link)}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">View the post</a></p>
  <p style="font-size:13px;color:#6b7280">Stay safe: meet in a public place, and ask the other person to describe something only the owner would know.<br>You can turn these emails off from "My posts" on TraceBack.</p>
</div>`;
    return send({ to: recipient.email, subject, text, html });
}

module.exports = { send, matchAlert, escapeHtml };
