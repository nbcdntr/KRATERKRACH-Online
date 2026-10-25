# KRATERKRACH 1.0 ONLINE — private internet multiplayer beta

**Up to six total tanks** (human players plus computer opponents) on separate phones, **2–10 rounds per match (minimum two)**. No PC server needs to remain running after the server is deployed to Render, Railway or similar WebSocket-capable internet hosting. This archive contains the 0.8 artillery game's 0.9 online changes, original Web game, standalone HTML, Android Studio project, server source and server deployment file.

## What is implemented

* Private six-character room codes; host chooses 2–6 **total seats**, the number of CPU opponents (within that total), and 2–10 rounds (default 3).
* Remaining total seats can be filled by humans; for example 3 people + 3 CPU = 6 tanks. Seats beyond the room limit are rejected. Each human is assigned a unique room seat by the server.
* Host-authoritative simulation: remote actions go to host, which checks the active turn; guests receive world snapshots. Only the active player may move, aim and fire. Movement ends with a shot.
* Nine weapons, four tank classes, wind, limited trajectory prediction, deformed terrain and height-based fall damage from earlier versions.
* Fresh terrain and fully repaired tanks each round, accumulated wins/kills. Host clicks NEXT ROUND between rounds, with a final overall scoreboard.
* Tournament-style equal upgrades. Profiles and credits continue to be stored locally. **Online multiplayer does not yet sync accounts, credits or rankings.** Guests do not receive cloud rewards.
* The room server does not store profiles or match history. The host device must remain online for the match, but it does not host an internet endpoint. Rooms expire after two hours. The server processes WebSockets over WSS when deployed behind an HTTPS host.

Two humans may mutually agree to a two-person alliance before the match begins. The host adjusts health and shields for unallied players when alliances are active. Nicknames are assigned by the server and cannot be changed in the UI. The identity registry uses a local SQLite database; permanent worldwide uniqueness is **not assured on a free hosting plan with an ephemeral disk**.

This is an **internet multiplayer beta**, not a production-ready ranked online service. No dedicated authoritative game server, anti-cheat, disconnect recovery, persistent identities or guaranteed network synchronization yet. Connection/room relay was tested with seven WebSocket clients. Full multi-phone browser/gameplay testing remains necessary.

## Deploy an internet server (Render)

1. Create a private GitHub repository using [GitHub Desktop](https://desktop.github.com/) or the GitHub website. Place the **contents** of this folder in the repository root (not an extra enclosing subfolder). Commit and push.
2. Go to https://dashboard.render.com/, select **New > Blueprint**, connect the repository, and apply the detected `render.yaml`. Or choose **New > Web Service** with runtime Python, build command `pip install -r requirements.txt`, start command `python server.py`, health check `/health`, free plan for testing, and Frankfurt region if offered.
3. When Render shows *Live*, copy its real URL, e.g. `https://kraterkrach-online-xyz.onrender.com`. **Do not use this example as an actual server address.**
4. On both phones, open **that actual URL** in Chrome. The game UI is served by the same cloud server, so the SERVER field is auto-filled. Nothing must be installed on phones for this first browser-based test.
5. The host opens **ONLINE SPIEL**, chooses max players and minimum 2 rounds, creates a room and reads the six-character code. Guests open ONLINE SPIEL, paste the code, join. The host starts once at least two people are connected.
6. Android APK: open `android/` in Android Studio and rebuild as before, then install on each device. In **ONLINE SPIEL**, enter **the actual Render HTTPS URL** in both APKs. They then connect securely using WSS. (The web version is simpler for the first end-to-end test.)

**Render free plan note:** The free web service can go to sleep after 15 minutes without HTTP or incoming WebSocket messages and take around a minute to wake up. For reliable longer multiplayer sessions choose a paid always-on service. The current free plan restrictions are at https://render.com/docs/free.

## Test and diagnostics

Run `python -m pip install -r requirements.txt` and `python server.py` locally. Visit `http://localhost:8765/health`, expecting `{"ok":true,...}`. For local-only debugging, browse `http://localhost:8765/` and choose `http://localhost:8765` as room server. For real phones across internet, deploy the server and use HTTPS.

## Compatibility

* Android minimum SDK 24, target SDK 36, Android Studio project version 1.0.
* Local offline profile key remains `kraterkrach_profile_v03` (preserved from versions 0.3–0.8).
* The Android app uses WebView DOM storage and INTERNET permission; only HTTPS secure networking is allowed.
* All game code and artwork remain independently authored; no original DOS game code is included.

## Legal & attribution (added October 2026)

Visible **Impressum / Legal** and **Datenschutz / Privacy** links are now included in the game interface, with separate mobile-friendly pages at `/legal.html`, `/privacy.html`, `/impressum` and `/datenschutz`. The pages credit **Created by T. Gligor**, state that game use is free, and include a limited legally compatible beta disclaimer.

**Before public release:** complete the provider name, address, contact and data protection provider/processor fields clearly marked in orange. A waiver cannot eliminate all responsibility. See `PUBLISHING_CHECKLIST.md`. The game is usable as a private family beta while this information is completed.
