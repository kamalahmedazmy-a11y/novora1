/**
 * Pluggable EMAIL / SMS delivery utility.
 *
 * Providers are loaded lazily and are OPTIONAL: if the provider package
 * (nodemailer / twilio) is not installed, or the relevant env vars are not
 * configured, delivery falls back to console logging — it never crashes.
 *
 * To go live:
 *   - Email: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally
 *     MAIL_FROM) and run `npm i nodemailer`.
 *   - SMS:   set TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM and run `npm i twilio`.
 *
 * Other features call sendEmail / sendSms; no caller changes are needed when
 * real providers are later enabled.
 */

// Send an email. Uses SMTP (nodemailer) when configured, else logs to console.
export async function sendEmail({ to, subject, text, html } = {}) {
    if (!to) return { delivered: false, channel: 'skipped' };

    if (process.env.SMTP_HOST) {
        try {
            const nodemailer = (await import('nodemailer')).default;
            const transport = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            await transport.sendMail({
                from: process.env.MAIL_FROM || 'no-reply@novora.com',
                to,
                subject,
                text,
                html,
            });
            return { delivered: true, channel: 'email' };
        } catch (err) {
            // Fall through to the console fallback below.
        }
    }

    console.log('[mailer:console] EMAIL ->', to, '|', subject);
    return { delivered: false, channel: 'console' };
}

// Send an SMS. Uses Twilio when configured, else logs to console.
export async function sendSms({ to, body } = {}) {
    if (!to) return { delivered: false, channel: 'skipped' };

    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
        try {
            const twilio = (await import('twilio')).default;
            const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
            await client.messages.create({
                from: process.env.TWILIO_FROM,
                to,
                body,
            });
            return { delivered: true, channel: 'sms' };
        } catch (err) {
            // Fall through to the console fallback below.
        }
    }

    console.log('[mailer:console] SMS ->', to, '|', body);
    return { delivered: false, channel: 'console' };
}
