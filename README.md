# 📝 Maribeda (ಮರಿಬೇಡ)

![Maribeda Logo](assets/maribeda-logo.jpeg)

**Your Private Watchlist & Second Brain.**

Maribeda (Kannada for "Don't forget") is a local-first vault where you capture your thoughts and curate your favorite internet content—without the algorithms.

- **Remember everything** — A lightning-fast diary that finds your notes even when you make typos.
- **Private Watchlist** — Save videos and articles from Instagram/YouTube/Reddit/etc without training the recommendation engine.
- **100% Ownership** — Your data lives on your device. No login, no cloud, no tracking.

---

## 🛡️ Why Maribeda?

We live in a digital trade-off. To remember something, we usually have to give it away to a server. To save a video, we have to "Like" it and train an algorithm.

**Maribeda breaks the trade-off.**

| The Problem | Our Solution |
|-------------|--------------|
| 🧠 **Forgetting things** | FlexSearch finds `programing` even if you typed `programming` |
| 📡 **Feeding algorithms** | Save that viral Reel privately — it goes to your device, not their servers |
| 🔒 **Losing control** | No tracking. No profiling. No sync. Just your notes on your device. |

---

## ⚡ Magic Features

### 🎲 Rediscover (Serendipity Mode)

Search is for when you know what you want. **Rediscover is for when you don't.**

```
The Feature:  Tap the "🎲 Rediscover" button
The Result:   We surface a random note from months ago that you completely forgot
The Value:    "Oh wow! I forgot I saved this."
```

It turns your diary into a **discovery engine**.

---

### ✈️ Magic Share (Zero Cloud Transfer)

Move your life between devices effortlessly.

```
The Feature:  Click "Backup / Transfer"
The Magic:    On mobile → AirDrop or Nearby Share
              On desktop → Downloads a .sqlite file
The Tech:     Your database wrapped in a lightweight export. No server.
```

---

### 💡 See Also (Auto-Association)

Your brain connects ideas. **Maribeda does too.**

```
The Feature:  Open a note about "Leg Day" (Fitness)
The Result:   Maribeda surfaces a "Protein Shake" recipe 
              and a "Stoic Resilience" podcast you saved
The Value:    Accidental connections — no manual tagging required
```

**Works for URL-only notes too.** Saved 10 YouTube links with no titles? Open one, and we'll show you the others.

---

### 🔀 Smart Merge (Duplicate Detection)

Never save the same link twice. Maribeda catches duplicates and suggests merging.

```
You share:    youtube.com/v=abc123
We detect:    "Already saved in 'Kettlebell Exercises'"
You choose:   📂 Open Note  OR  📥 Append to it
```

Also works for **similar content** — if you share something titled "Kettlebell Swings", we'll surface your existing "Kettlebell Exercises" note and ask if you want to merge.

---

### 🔍 Smart Search

FlexSearch finds what you're looking for — even when you're mid-thought.

| You type | We find |
|----------|---------|
| `progra` | programming, programs, programmer |
| `point` | pointers, pointing, powerpoint |
| `recip` | recipe, recipes, recipient |
| `JAVASCRIPT` | javascript (case insensitive) |

Start typing and results appear **instantly** — no need to finish the word.

---

## 📌 More Features

| Feature | Description |
|---------|-------------|
| **Pin to Top** | Keep important notes always visible |
| **Dark Mode** | Easy on the eyes, day or night |
| **URL Detection** | Links become clickable automatically |
| **PWA Ready** | Install as an app, works offline |
| **Web Share Target** | Share from any app directly to Maribeda (Android) |

---

## 🏗️ Architecture

```
┌─────────────────┐  ┌──────────────────┐
│   SQLite WASM   │  │   FlexSearch     │
│   (Storage)     │  │   (Search)       │
│                 │  │                  │
│ • Transactions  │  │ • Fuzzy Search   │
│ • ACID          │  │ • Typo Tolerance │
│ • Persistence   │  │ • Ranking        │
└─────────────────┘  └──────────────────┘
         ↓                    ↓
    ┌────────────────────────────────┐
    │      IndexedDB Cache           │
    │   (Browser Persistence)        │
    └────────────────────────────────┘
```

**Zero servers. Zero tracking. Zero compromises.**

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Storage** | SQLite WASM (battle-tested, portable) |
| **Search** | FlexSearch (fastest JS search, typo-tolerant) |
| **Persistence** | IndexedDB (browser-native, async) |
| **Frontend** | React + TypeScript |
| **Build** | Vite |

---

## 🛠️ Getting Started

### For Users
1. Visit [maribeda.vercel.app](https://maribeda.vercel.app)
2. Start capturing — no signup needed
3. Your notes are stored locally in your browser

### For Developers

```bash
git clone https://github.com/sharathbyregowda/maribeda.git
cd maribeda
npm install
npm run dev
```

---

## 📊 Performance

- **Bundle**: ~110KB gzipped
- **Search**: <10ms for 1000 notes
- **Offline**: ✅ Full functionality

---

## 🌟 The Vision

Maribeda is your **Second Brain** and **Shadow Library** combined.

A place to capture thoughts, save content, and rediscover ideas — without giving up your privacy.

**Your thoughts. Your saves. Your control.**

---

**Built with ❤️ for privacy, performance, and digital freedom.**
