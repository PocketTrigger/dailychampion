// Daily Champion's Discord helper (a Cloudflare Worker).
// - POST /api/token        swaps the Discord sign-in code from the Activity for an access token
// - POST /api/progress     posts or edits the player's live battle card in the channel
// - POST /interactions     Discord's Interactions Endpoint: answers the "Play now!" button
// The game reaches /api/... through Discord's proxy (URL Mapping /api -> this Worker).
// Secrets (set with `wrangler secret put`): DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN.
// Variables (wrangler.toml): DISCORD_CLIENT_ID, DISCORD_PUBLIC_KEY. Storage: KV namespace CARDS.

const API = 'https://discord.com/api/v10';
const SPRITES = 'https://play.pokemonshowdown.com/sprites/trainers/';
const GAME_URL = 'https://dailychampion.au';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/interactions') return await interactions(request, env);
      if (request.method === 'POST' && url.pathname.endsWith('/token')) return await token(request, env);
      if (request.method === 'POST' && url.pathname.endsWith('/progress')) return await progress(request, env);
      if (request.method === 'GET' && url.pathname === '/') return new Response('Daily Champion Discord helper is running.');
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// ---------- Sign-in ----------
async function token(request, env) {
  const { code } = await request.json();
  if (typeof code !== 'string' || !code) return json({ error: 'missing code' }, 400);
  const r = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code })
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) return json({ error: 'token exchange failed' }, 400);
  return json({ access_token: data.access_token });
}

// Who owns this access token (cached for 10 minutes so each update doesn't ask Discord again)
async function userFor(accessToken, env) {
  const cacheKey = 'user:' + await sha256(accessToken);
  const cached = await env.CARDS.get(cacheKey, 'json');
  if (cached) return cached;
  const r = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const user = {
    id: u.id,
    name: u.global_name || u.username,
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id) >> 22n) % 6n}.png`
  };
  await env.CARDS.put(cacheKey, JSON.stringify(user), { expirationTtl: 600 });
  return user;
}

// ---------- Live battle card ----------
async function progress(request, env) {
  const body = await request.json();
  const user = typeof body.access_token === 'string' ? await userFor(body.access_token, env) : null;
  if (!user) return json({ error: 'not signed in' }, 401);
  const channel = /^\d{5,25}$/.test(body.channel_id || '') ? body.channel_id : null;
  if (!channel) return json({ error: 'no channel' }, 400);
  const s = cleanState(body.state);
  if (!s) return json({ error: 'bad state' }, 400);

  const key = `card:${channel}:${user.id}:${s.day}`;
  const message = { embeds: [cardEmbed(user, s)], components: [playButton()], allowed_mentions: { parse: [] } };
  const bot = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  const existing = await env.CARDS.get(key);
  if (existing) {
    const r = await fetch(`${API}/channels/${channel}/messages/${existing}`, { method: 'PATCH', headers: bot, body: JSON.stringify(message) });
    if (r.ok) return json({ ok: true, edited: true });
    if (r.status !== 404) return json({ error: 'edit failed', status: r.status }, 502);
    // The card was deleted: post a new one below
  }
  const r = await fetch(`${API}/channels/${channel}/messages`, { method: 'POST', headers: bot, body: JSON.stringify(message) });
  if (!r.ok) return json({ error: 'post failed', status: r.status }, 502);   // e.g. the bot isn't in this server
  const posted = await r.json();
  await env.CARDS.put(key, posted.id, { expirationTtl: 3 * 86400 });
  return json({ ok: true, posted: true });
}

// The game is the source of the numbers, so only accept small, well-formed values
function cleanState(s) {
  if (!s || typeof s !== 'object') return null;
  const text = (v, n) => String(v == null ? '' : v).replace(/[*_`~|>\\@#<]/g, '').slice(0, n);
  const flags = v => Array.isArray(v) ? v.slice(0, 6).map(Boolean) : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.day || '')) return null;
  return {
    day: s.day, num: Math.max(0, Math.min(99999, parseInt(s.num, 10) || 0)),
    boss: text(s.boss, 40), sprite: /^[a-z0-9-]{1,40}$/.test(s.sprite || '') ? s.sprite : null,
    diff: text(s.diff, 12), turn: Math.max(0, Math.min(999, parseInt(s.turn, 10) || 0)),
    me: flags(s.me), foe: flags(s.foe), done: !!s.done, won: !!s.won, shiny: s.shiny ? text(s.shiny, 40) : null
  };
}

function cardEmbed(user, s) {
  const me = s.me.map(a => a ? '🟩' : '🟥').join(''), foe = s.foe.map(a => a ? '🔴' : '💀').join('');
  const left = s.me.filter(Boolean).length;
  let author = `${user.name} is battling`, color = 0x5865f2, status = s.turn ? `Turn ${s.turn}` : 'Battle started';
  if (s.done) {
    author = s.won ? `${user.name} won!` : `${user.name} lost`;
    color = s.won ? 0x3ba55c : 0xed4245;
    status = s.won ? `🏆 Beat ${s.boss} in ${s.turn} turns with ${left}/6 left` : `❌ Fell to ${s.boss} on turn ${s.turn}`;
    if (s.shiny) status += `\n✨ Caught a shiny ${s.shiny}`;
  }
  return {
    color,
    author: { name: author, icon_url: user.avatar },
    title: `Daily Champion #${s.num} · vs ${s.boss}${s.diff ? ` (${s.diff})` : ''}`,
    url: GAME_URL,
    description: `${status}\n\`Me:  \` ${me}\n\`Boss:\` ${foe}`,
    thumbnail: s.sprite ? { url: SPRITES + s.sprite + '.png' } : undefined
  };
}

const playButton = () => ({ type: 1, components: [{ type: 2, style: 1, label: 'Play now!', custom_id: 'dc_launch' }] });

// ---------- Interactions Endpoint ----------
async function interactions(request, env) {
  const sig = request.headers.get('X-Signature-Ed25519'), ts = request.headers.get('X-Signature-Timestamp');
  const raw = await request.text();
  if (!sig || !ts || !(await verify(env.DISCORD_PUBLIC_KEY, sig, ts + raw))) return new Response('bad signature', { status: 401 });
  const i = JSON.parse(raw);
  if (i.type === 1) return json({ type: 1 });                                     // PING -> PONG
  if (i.type === 3 && i.data && i.data.custom_id === 'dc_launch') return json({ type: 12 });   // button -> launch the Activity
  if (i.type === 2) return json({ type: 12 });                                    // Entry Point / slash command -> launch
  return json({ type: 4, data: { content: 'Open Daily Champion from the Activities menu to play.', flags: 64 } });
}

async function verify(publicKeyHex, sigHex, message) {
  try {
    const key = await crypto.subtle.importKey('raw', hex(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, hex(sigHex), new TextEncoder().encode(message));
  } catch (e) {
    return false;
  }
}
const hex = h => new Uint8Array((h.match(/.{2}/g) || []).map(b => parseInt(b, 16)));
async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
