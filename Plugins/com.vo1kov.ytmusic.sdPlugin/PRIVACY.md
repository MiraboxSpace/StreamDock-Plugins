# Privacy policy — VO1KOV YT Music (Stream Dock plugin and Chrome extension)

Last updated: 30 October 2026

**Short version:** nothing is collected, stored on a server, sold or shared. Everything runs on your own computer.

## What the Chrome extension does

The extension runs only on `https://music.youtube.com/*`. It:

- reads the current track (video ID, title, artist, play state) and its like status from the open YouTube Music page;
- when you press a Stream Dock key, likes/dislikes the track, lists your editable playlists, adds the track to a playlist, starts radio or My Supermix — by calling YouTube Music's own web endpoints on `music.youtube.com`, with the session you are already signed in with. To authorize these calls it computes the same request signature the YouTube Music page itself uses, from your existing session cookie. The cookie and signature never leave the page except in those requests to `music.youtube.com`;
- passes the track info, like status and playlist list (titles, IDs, cover image URLs) from the page to its own background script, which sends them to the Stream Dock plugin over `ws://127.0.0.1:39871` — a local connection that never leaves your computer. This is why the extension asks for access to `127.0.0.1`.

## What the Stream Dock plugin does

- receives that information over the local connection and draws it on your keys;
- downloads playlist cover images from Google/YouTube image servers (`*.googleusercontent.com`, `*.ytimg.com`, `*.ggpht.com`) to show them on the keys; covers are kept in memory only;
- writes a small diagnostic log (`plugin/log.txt`: connection events and errors, capped at 512 KB) in its own folder; it never leaves your computer.

## What is not done

- No analytics, tracking, advertising or telemetry.
- No data is sent to the developer or any third party.
- No passwords, cookies or tokens are stored.
- Nothing is read from websites other than `music.youtube.com`.

## Contact

Questions: open an issue at [github.com/sergvo1kov](https://github.com/sergvo1kov).

Unofficial. Not affiliated with Google, YouTube or MiraBox.
