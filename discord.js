// Discord Activity handshake. Loaded by env.js only when the game runs inside Discord.
// Tells Discord the page is ready so it stops showing its loading screen. No sign-in is used,
// so there's no backend; saves stay in this device's browser storage, as on the website.
try {
  const { DiscordSDK } = await import('./vendor/discord-embedded-app-sdk.js');
  if (!/^\d+$/.test(window.DISCORD_CLIENT_ID)) throw new Error('DISCORD_CLIENT_ID in env.js is not set');
  const sdk = new DiscordSDK(window.DISCORD_CLIENT_ID);
  await sdk.ready();
  window.dcDiscordSDK = sdk;
  console.info('Daily Champion: connected to Discord');
} catch (e) {
  // The game keeps working either way
  console.warn('Daily Champion: Discord handshake failed:', e);
}
