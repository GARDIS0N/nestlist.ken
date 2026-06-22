const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_KEY = process.env.MPESA_KEY || 'Krt8pu4qFzcfbdsibP2GGPflwcSOqKFWNdMXDXyYkmR1Z1Lk';
const MPESA_SECRET = process.env.MPESA_SECRET || '***REMOVED-ROTATED-CREDENTIAL***';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '***REMOVED-ROTATED-CREDENTIAL***';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://nestlist-server.onrender.com/api/mpesa/callback';
const AT_API_KEY = process.env.AT_API_KEY || '***REMOVED-ROTATED-CREDENTIAL***';
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';

const MPESA_BASE = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

function formatPhone(phone) {
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('+')) p = p.substring(1);
  if (p.startsWith('0')) p = '254' + p.substring(1);
  if (p.startsWith('7')) p = '254' + p;
  if (!p.startsWith('254')) p = '254' + p;
  if (p.length !== 12) p = '254' + p.slice(-9);
  return p;
}

function getTimestamp() {
  const d = new Date();
  return d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0');
}

function getPassword() {
  const timestamp = getTimestamp();
  const str = MPESA_SHORTCODE + MPESA_PASSKEY + timestamp;
  return Buffer.from(str).toString('base64');
}

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const auth = Buffer.from(MPESA_KEY + ':' + MPESA_SECRET).toString('base64');
  const res = await axios.get(
    MPESA_BASE + '/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: 'Basic ' + auth } }
  );
  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return cachedToken;
}

app.get('/', (req, res) => {
  res.json({ status: 'NestList API running', version: '1.0.0' });
});

app.get('/api/mpesa/token', async (req, res) => {
  try {
    const token = await getToken();
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mpesa/stk', async (req, res) => {
  try {
    const { phone, amount, listingId, listingTitle } = req.body;
    if (!phone || !amount) {
      return res.status(400).json({ success: false, error: 'Phone and amount required' });
    }
    const formattedPhone = formatPhone(phone);
    const timestamp = getTimestamp();
    const password = getPassword();
    const token = await getToken();
    const stkRes = await axios.post(
      MPESA_BASE + '/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: 'NESTLIST',
        TransactionDesc: 'NestList Listing Fee'
      },
      { headers: { Authorization: 'Bearer ' + token } }
    );
    const checkoutId = stkRes.data.CheckoutRequestID;
    await supabase.from('listing_payments').insert({
      property_id: listingId || null,
      landlord_id: null,
      amount: Math.ceil(amount),
      amount_paid: Math.ceil(amount),
      status: 'pending',
      mpesa_checkout_request_id: checkoutId,
      payer_phone: formattedPhone
    });
    res.json({
      success: true,
      checkoutId,
      message: 'STK push sent. Check your phone.'
    });
  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message;
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/mpesa/callback', async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
    if (ResultCode === 0) {
      let mpesaCode = '';
      let phone = '';
      if (CallbackMetadata && CallbackMetadata.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaCode = item.Value;
          if (item.Name === 'PhoneNumber') phone = item.Value.toString();
        }
      }
      const { data: payments } = await supabase
        .from('listing_payments')
        .select('*')
        .eq('mpesa_checkout_request_id', CheckoutRequestID)
        .limit(1);
      if (payments && payments.length > 0) {
        const payment = payments[0];
        await supabase
          .from('listing_payments')
          .update({
            status: 'confirmed',
            mpesa_code: mpesaCode,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', payment.id);
        if (payment.property_id) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await supabase
            .from('properties')
            .update({
              is_active: true,
              expires_at: expiresAt.toISOString()
            })
            .eq('id', payment.property_id);
          const { data: props } = await supabase
            .from('properties')
            .select('title, location, landlord_id')
            .eq('id', payment.property_id)
            .limit(1);
          if (props && props.length > 0) {
            const prop = props[0];
            const { data: landlords } = await supabase
              .from('profiles')
              .select('phone')
              .eq('id', prop.landlord_id)
              .limit(1);
            if (landlords && landlords.length > 0) {
              const landlordPhone = landlords[0].phone;
              const smsMsg = `NestList: Your ${payment.property_type || 'listing'} in ${prop.location || ''} is now LIVE! Active for 30 days. Receipt: ${mpesaCode}. Visit nestlist.co.ke`;
              try {
                await sendSMS(landlordPhone, smsMsg);
              } catch (e) {}
            }
          }
        }
      }
    } else {
      const { data: payments } = await supabase
        .from('listing_payments')
        .select('*')
        .eq('mpesa_checkout_request_id', CheckoutRequestID)
        .limit(1);
      if (payments && payments.length > 0) {
        await supabase
          .from('listing_payments')
          .update({
            status: 'failed',
            failure_reason: ResultDesc
          })
          .eq('id', payments[0].id);
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

app.get('/api/mpesa/status', async (req, res) => {
  try {
    const { checkoutId } = req.query;
    if (!checkoutId) {
      return res.status(400).json({ error: 'checkoutId required' });
    }
    const { data } = await supabase
      .from('listing_payments')
      .select('status')
      .eq('mpesa_checkout_request_id', checkoutId)
      .limit(1);
    if (data && data.length > 0) {
      res.json({ status: data[0].status });
    } else {
      res.json({ status: 'pending' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function sendSMS(phone, message) {
  const formattedPhone = formatPhone(phone);
  const res = await axios.post(
    'https://api.sandbox.africastalking.com/version1/messaging',
    new URLSearchParams({
      username: AT_USERNAME,
      to: formattedPhone,
      message: message,
      from: 'NestList'
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY
      }
    }
  );
  await supabase.from('sms_logs').insert({
    type: 'outgoing',
    recipient_phone: formattedPhone,
    message: message,
    status: 'sent'
  });
  return res.data;
}

app.post('/api/sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message required' });
    }
    await sendSMS(phone, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('NestList API running on port ' + PORT);
});
