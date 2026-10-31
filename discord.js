// Discord Activity support. Loaded by env.js only when the game runs inside Discord.
// 1. Handshake: tells Discord the page is ready so it stops showing its loading screen.
// 2. Sign-in: a one-time "Authorize" popup (username and avatar only), so the live battle card
//    in the channel can show who is playing. The code is swapped for a token by our Worker
//    (worker/), reached through Discord's proxy at /.proxy/api.
// 3. window.dcDiscordReport(state): game.js calls this with battle progress; the Worker posts or
//    edits the card. Everything here is optional: if any step fails, the game keeps working.
const API = '/.proxy/api';
let sdk = null, accessToken = null, pending = null, sending = false;

async function send(state) {
  pending = state;
  if (sending || !accessToken || !sdk.channelId) return;
  sending = true;
  while (pending) {
    const body = { access_token: accessToken, channel_id: sdk.channelId, guild_id: sdk.guildId, state: pending };
    pending = null;
    try {
      const r = await fetch(`${API}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) console.warn('Daily Champion: battle card not updated', r.status, await r.text());
    } catch (e) {
      console.warn('Daily Champion: battle card not updated', e);
    }
  }
  sending = false;
}
// Updates that arrive before sign-in finishes are kept and sent once it does
window.dcDiscordReport = state => { pending = state; send(state); };

try {
  const { DiscordSDK } = await import('./vendor/discord-embedded-app-sdk.js');
  if (!/^\d+$/.test(window.DISCORD_CLIENT_ID)) throw new Error('DISCORD_CLIENT_ID in env.js is not set');
  sdk = new DiscordSDK(window.DISCORD_CLIENT_ID);
  await sdk.ready();
  window.dcDiscordSDK = sdk;
  console.info('Daily Champion: connected to Discord');
} catch (e) {
  console.warn('Daily Champion: Discord handshake failed:', e);
}

if (sdk) {
  try {
    const { code } = await sdk.commands.authorize({ client_id: window.DISCORD_CLIENT_ID, response_type: 'code', state: '', prompt: 'none', scope: ['identify'] });
    const r = await fetch(`${API}/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const data = await r.json();
    if (!data.access_token) throw new Error(data.error || 'no access token');
    await sdk.commands.authenticate({ access_token: data.access_token });
    accessToken = data.access_token;
    if (pending) send(pending);
  } catch (e) {
    console.warn('Daily Champion: Discord sign-in skipped, so no battle card:', e);
  }
}
