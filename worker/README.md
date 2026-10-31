# Daily Champion Discord helper (Cloudflare Worker)

Posts and updates the live battle card in a Discord channel when someone plays the daily inside
Discord, and answers the card's **Play now!** button. It's free on Cloudflare's Workers plan.

| Path | What it does |
|---|---|
| `POST /api/token` | Swaps the Discord sign-in code from the game for an access token (needs the client secret) |
| `POST /api/progress` | Posts the player's battle card in the channel, then edits it as the battle goes (needs the bot token) |
| `POST /interactions` | Discord's Interactions Endpoint: checks Discord's signature, launches the game from **Play now!** |

## One-time setup

You need Node.js (already on this PC) and a free Cloudflare account (https://dash.cloudflare.com/sign-up).
Run these in a terminal opened in this `worker` folder.

1. Sign in to Cloudflare (opens your browser):
   ```
   npx wrangler login
   ```
2. Create the storage for card message IDs, and put the `id` it prints into `wrangler.toml`
   (replacing `REPLACE_WITH_KV_NAMESPACE_ID`):
   ```
   npx wrangler kv namespace create CARDS
   ```
3. In the Discord Developer Portal, **General Information**: copy the **Public Key** into
   `wrangler.toml` (replacing `REPLACE_WITH_PUBLIC_KEY`). It's public, not a secret.
4. Add the two secrets. Each command asks you to paste the value; it's stored by Cloudflare,
   never in the project:
   - **OAuth2** page → **Client Secret** (Reset Secret to see it):
     ```
     npx wrangler secret put DISCORD_CLIENT_SECRET
     ```
   - **Bot** page → **Reset Token**:
     ```
     npx wrangler secret put DISCORD_BOT_TOKEN
     ```
5. Deploy. It prints the Worker's address, like `https://dailychampion-discord.<you>.workers.dev`:
   ```
   npx wrangler deploy
   ```

Then in the Discord Developer Portal:

6. **General Information** → **Interactions Endpoint URL**: `https://dailychampion-discord.<you>.workers.dev/interactions`
   (Discord tests it when you save; it should be accepted).
7. **Activities** → **URL Mappings** → add a Proxy Path: `/api` → `dailychampion-discord.<you>.workers.dev`
8. **OAuth2** → **Redirects**: add `https://127.0.0.1` (Discord wants one listed for the in-app sign-in).
9. **Installation** → Guild Install: scopes `applications.commands` and `bot`, permissions
   **View Channels**, **Send Messages**, **Embed Links**. Open the install link again and re-add
   the app to your server so the bot joins it.

Now launch the game in a channel: a card appears and updates as you battle.

## Notes
- Only daily battles post a card, one per player per day per channel. Practice battles don't.
- The card's numbers come from the player's game, so they're not tamper-proof (fine for a casual game).
- In DMs or servers the bot isn't in, the game works but no card is posted.
- Logs: `npx wrangler tail` shows live requests and errors.
