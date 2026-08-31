// SMS delivery via Africa's Talking, as specified in the architecture doc.
//
// This automatically uses the REAL Africa's Talking API once you set
// AT_API_KEY and AT_USERNAME in backend/.env — get those from
// https://account.africastalking.com (sandbox credentials work for testing;
// in sandbox, only phone numbers you've registered as simulator recipients
// in your AT dashboard will actually receive the SMS).
//
// With no credentials set, it falls back to a mock that just logs the
// message and stores it for the "SMS log" page in the app — this is why
// customers don't receive a text out of the box: there's no SMS account
// wired up yet. Set the two env vars below and restart the server to send
// real messages instead.

import "dotenv/config";

const outbox = []; // in-memory log of "sent" messages, exposed for the demo UI
let atSms = null;

if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
  const africastalking = (await import("africastalking")).default;
  const at = africastalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
  atSms = at.SMS;
  // eslint-disable-next-line no-console
  console.log(`[sms] Africa's Talking configured for username "${process.env.AT_USERNAME}" — sending real SMS.`);
} else {
  // eslint-disable-next-line no-console
  console.log('[sms] AT_API_KEY / AT_USERNAME not set — SMS is mocked. See /api/sms/outbox or the app\'s "SMS log" page.');
}

export async function sendSms(phone, message) {
  const record = {
    to: phone,
    message,
    sentAt: new Date().toISOString(),
    provider: atSms ? "africastalking" : "africastalking (mocked)",
  };

  if (atSms) {
    try {
      const result = await atSms.send({
        to: [phone],
        message,
        from: process.env.AT_SHORTCODE || undefined,
      });
      record.result = result;
    } catch (err) {
      record.error = err.message;
      // eslint-disable-next-line no-console
      console.error(`[sms] Africa's Talking send failed for ${phone}:`, err.message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`[SMS -> ${phone}] ${message}`);
  }

  outbox.push(record);
  if (outbox.length > 200) outbox.shift();
  return { status: record.error ? "Failed" : "Success", recipient: phone };
}

export function getOutbox() {
  return [...outbox].reverse();
}

export function buildTrackingSms({ shopName, trackingNumber, releaseCode, trackingUrl }) {
  return `Your order from ${shopName} is on the way! Track live: ${trackingUrl}. Your release code is ${releaseCode}. Give this code to the rider only upon receiving your items.`;
}
