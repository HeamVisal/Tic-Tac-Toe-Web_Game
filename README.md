# Tic · Tac · Toe 🎮

The classic XO game, all grown up — six board sizes, a computer opponent, and real-time
online play with chat, all in a page that loads instantly. No frameworks, no build step,
no backend, no ads, no sign-up. Just open it and play. ✨

**▶ Play now:** https://heamvisal.github.io/Tic-Tac-Toe-Web_Game/

![Tic Tac Toe preview](assets/og-image.png)

*Also answers to: the XO game, XOX, OXO, the OOO game, Xs and Os, noughts and crosses —
and on the big boards it plays like Gomoku (five in a row).*

## 🚀 Play with a friend in 10 seconds

1. Open the game and pick a nickname (or keep the suggested one)
2. Tap **Online friend** — you get a 6-character game key like `XK4QP2`
3. Send your friend the key (they type it in the join box) or just the invite link
4. That's it — play, chat, and talk trash 🤡

## 🕹️ What's inside

**Three ways to play**
- 👥 **Two players** — pass and play on one device
- 🤖 **Vs computer** — *Easy*, *Tricky*, or *Perfect* (unbeatable on 3×3, a fork-hunting
  menace on the big boards) — with an Undo button when you fumble
- 🌍 **Online friend** — peer-to-peer play with a shared key or link

**Six boards** — classic **3×3** (three in a row) up to **20×20** (five in a row, Gomoku-style):
3×3 · 5×5 · 7×7 · 10×10 · 15×15 · 20×20

**Online extras**
- 💬 Chat with emoji and quick taunts ("You're too slow 🐢", "Noob 🤡")
- ⏱️ Optional move timer (15/30/60s) — run out and you forfeit the round
- 🔁 Fair-play rules: new rounds, score resets and board changes need *both* players to agree
- 🔌 Connection drop? The game waits and restores itself when you rejoin — board, scores and turn intact
- 🪑 A third person trying your key is politely told the game is full (and who's playing)
- 🆕 If your opponent leaves, one click starts a fresh game with a new key

**The little things**
- 🎲 Random first turn, then the **loser starts** the next round (draws swap sides)
- 🎉 Confetti when you win, sounds for moves/wins/messages (mutable), last-move highlight
- 🌙 Light/dark theme toggle · 🇰🇭 **English / ខ្មែរ (Khmer)** language toggle
- ♿ Keyboard navigation and screen-reader labels
- 💾 Scores and settings remembered between visits

## 🔒 Privacy

No account, no tracking, no personal data collected. Your nickname and scores live only in
your own browser. Online games connect the two browsers **directly to each other** (WebRTC
peer-to-peer via [PeerJS](https://peerjs.com/) — its free public broker is used only for the
initial handshake). Moves and chat go straight between you and your friend and are never
stored on any server.

> ⚠️ One honest limitation: on very restrictive networks (some corporate/school firewalls)
> WebRTC may fail to connect, since the free setup has no relay server.

## 🛠️ Run it locally

It's plain HTML/CSS/JS — nothing to install:

```bash
git clone https://github.com/HeamVisal/Tic-Tac-Toe-Web_Game.git
cd Tic-Tac-Toe-Web_Game
python3 -m http.server 8000   # or any static server
```

Open http://localhost:8000 and play.

```
index.html          Markup, SEO/social meta, structured data
style.css           All styles (custom font embedded as a data URI)
script.js           Game engine, AI, online play, chat, i18n (EN/KM)
assets/             Icon, share image, bundled PeerJS
robots.txt          Crawler rules
sitemap.xml         Sitemap for search engines
```

## 🌐 Hosting

Built for **GitHub Pages**: *Settings → Pages → Deploy from a branch* (`master`, root) and
you're live. All paths are relative, so any static host works.

---

Made with ❤️ — have fun, and remember: the loser starts the next round, so losing is
basically a strategy. 😄
