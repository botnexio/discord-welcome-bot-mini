# Discord Welcome Bot Mini

Ein kleiner discord.js-v14-Bot in einer Datei (`src/bot.js`): Er postet eine Willkommens-Nachricht (Embed) in einem Kanal deiner Wahl, wenn jemand dem Server beitritt, kann neuen Mitgliedern automatisch eine Rolle geben und beantwortet `/ping` und `/help`. Kein Dashboard, keine Datenbank.

## Voraussetzungen
- Node.js 22.13 oder neuer
- Eine Discord-Anwendung mit Bot-Benutzer (https://discord.com/developers/applications)

## Setup in 5 Minuten
1. `npm ci` (installiert die exakten Versionen aus `package-lock.json`)
2. `.env.example` nach `.env` kopieren und ausfüllen:
   - `DISCORD_TOKEN` – Bot-Token (Developer Portal → Bot → Reset Token). Niemals weitergeben oder committen.
   - `WELCOME_CHANNEL_ID` – ID des Willkommens-Kanals (Entwicklermodus in Discord aktivieren, Rechtsklick auf den Kanal → Kanal-ID kopieren).
   - `AUTO_ROLE_ID` – optional: Rollen-ID für neue Mitglieder; leer lassen zum Deaktivieren.
   - `WELCOME_TITLE`, `WELCOME_MESSAGE`, `WELCOME_COLOR` – optional. Platzhalter: `{user}` (Erwähnung), `{username}`, `{server}`, `{memberCount}`.
   - `GUILD_ID` – optional: Server-ID; dort werden `/ping` und `/help` sofort registriert (ohne sie global, das kann etwas dauern).
3. `npm start`

## Fehlerbehebung
- `Login failed: DISCORD_TOKEN is invalid` – kopiere ein neues Token aus dem Developer Portal (Bot → Reset Token) in die `.env`. Der Bot gibt eine Zeile aus und beendet sich, ohne Stacktrace.
- `Login failed: enable "Server Members Intent"` – siehe *Intents* unten.

## Intents
Im Developer Portal → Bot → *Privileged Gateway Intents* den **Server Members Intent** (`GUILD_MEMBERS`) aktivieren. Ohne ihn schickt Discord keine Beitritts-Events. Zusätzlich nutzt der Bot den nicht privilegierten Intent `GUILDS`.

## Berechtigungen beim Einladen
Mit den Scopes `bot` und `applications.commands` und diesen Berechtigungen einladen:
- Kanäle ansehen, Nachrichten senden, Links einbetten (Willkommens-Nachricht)
- Rollen verwalten (nur wenn du `AUTO_ROLE_ID` nutzt)

Beispiel-URL (`CLIENT_ID` ersetzen; permissions = 268454912):
`https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=268454912`

Auto-Rolle: In den Servereinstellungen → Rollen muss die Rolle des Bots **über** der zu vergebenden Rolle stehen.

## Hosting
Der Bot läuft nur, solange sein Node.js-Prozess läuft. Du kannst ihn auf deinem eigenen PC, einem Raspberry Pi oder einem VPS betreiben, also auf jedem Rechner mit Node.js 22.13 oder neuer, der durchgehend an ist. Damit er nach dem Schließen des Terminals oder nach einem Absturz weiterläuft, nutze einen Prozessmanager wie [pm2](https://pm2.keymetrics.io/):
`npm install -g pm2`, danach `pm2 start npm --name welcome-bot-mini -- start`. Die `.env` bleibt nur auf diesem Rechner und wird nie committet. Bestimmte Hosting-Anbieter empfehlen wir nicht.

## Entwicklung
`npm test` (eingebauter Node-Test-Runner, keine Discord-Verbindung nötig).

## Offizieller Download, Updates und größere Starter
- Offizielle Download-Seite und Updates: <https://botnexio.com/kostenlos/discord-welcome-bot-mini>
- Du brauchst mehr (Tickets, Community-Funktionen, temporäre Sprachkanäle)? Die größeren Starter wie der Ticket Bot, der Community Bot und der Temp-Voice Bot findest du im Botnexio-Katalog: <https://botnexio.com/de/katalog>

## Support
E-Mail an [support@aramac.me](mailto:support@aramac.me) oder über das Kontaktformular: <https://botnexio.com/kontakt>.

## Lizenz & Hinweise
Veröffentlicht unter der MIT-Lizenz (siehe `LICENSE`) von der Aramac GmbH, dem Unternehmen hinter Botnexio. Discord ist eine Marke der Discord Inc.; dieses Projekt ist nicht mit Discord Inc. verbunden und wird nicht von Discord Inc. unterstützt. Der Bot braucht den privilegierten Server Members Intent; als Betreiber deines Bots bist du für den Datenschutz auf deinem Server verantwortlich. Ergänzende Hinweise nach deutschem Recht: https://botnexio.com/lizenz/discord-welcome-bot-mini
