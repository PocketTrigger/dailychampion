// Where the game is running: the normal website, or inside Discord as an Activity.
// Inside Discord the page can only load files through Discord's proxy, so images from other
// sites are requested as /.proxy/<prefix>/... (the prefixes are set up as URL Mappings in the
// Discord Developer Portal; see HOW-IT-WORKS.txt section 13).
(function () {
  // The Discord application's ID (public, not a secret). Set after creating the app.
  window.DISCORD_CLIENT_ID = '1565931147073167440';

  const q = new URLSearchParams(location.search);
  window.DC_DISCORD = /\.discordsays\.com$/.test(location.hostname) || (q.has('frame_id') && q.has('instance_id'));

  const PROXY = { 'raw.githubusercontent.com': 'pokeapi', 'play.pokemonshowdown.com': 'showdown' };
  // Full address of a file on another site, routed through Discord's proxy when needed
  window.dcExt = (host, path) => window.DC_DISCORD && PROXY[host] ? `/.proxy/${PROXY[host]}${path}` : `https://${host}${path}`;

  if (window.DC_DISCORD) {
    document.documentElement.classList.add('in-discord');
    // Let Discord know the game has loaded (discord.js does the SDK handshake)
    window.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'discord.js';
      document.head.appendChild(s);
    });
  }
})();
