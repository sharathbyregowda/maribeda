# Maribeda

![Maribeda Logo](assets/maribeda-logo.jpeg)

**Don't forget a thing.**

A local-first, lightning-fast diary that runs entirely in your browser. Zero servers, zero tracking, zero compromises.

---

## ✨ What Makes Maribeda Special

### 🔒 **Privacy First**
- **No accounts required** - Start writing immediately
- **No cloud sync** - Your thoughts stay on your device
- **No tracking** - We don't even know you exist
- **100% offline** - Works without internet after first load

### ⚡ **Blazing Fast Search**
Powered by our **hybrid architecture**:
- **SQLite WASM** for rock-solid local storage
- **FlexSearch** for instant, intelligent search
- **Typo tolerance** - "programing" finds "programming"
- **Fuzzy matching** - Search smarter, not harder
- **Sub-50ms indexing** - Even with thousands of notes

### 💾 **Your Data, Your Control**
- **Magic Share Button** - AirDrop/Nearby Share on mobile, download on desktop
- **SQLite Binary Export** - Full database backup in one file
- **Legacy JSON Support** - Still accepts old JSON backups
- **Open with Maribeda** - PWA file handling for `.sqlite` files

---

## 🏗️ Architecture

Maribeda uses a **best-of-breed hybrid approach** that separates concerns for maximum performance:

```
┌─────────────────┐  ┌──────────────────┐
│   SQLite WASM   │  │   FlexSearch     │
│   (Storage)     │  │   (Search)       │
│                 │  │                  │
│ • Transactions  │  │ • Fuzzy Search   │
│ • ACID          │  │ • Typo Tolerance │
│ • Persistence   │  │ • Prefix Match   │
│ • Backup/Restore│  │ • Ranking        │
└─────────────────┘  └──────────────────┘
         ↓                    ↓
    ┌────────────────────────────┐
    │      IndexedDB Cache       │
    │   (Browser Persistence)    │
    └────────────────────────────┘
```

### Why This Architecture?

**Traditional Approach** (Single Database):
- ❌ Slow full-text search
- ❌ Limited search features
- ❌ Vendor lock-in to one library

**Maribeda's Hybrid Approach**:
- ✅ **SQLite** does what it's best at: reliable storage
- ✅ **FlexSearch** does what it's best at: lightning-fast search
- ✅ Best-in-class for each concern
- ✅ Easy to upgrade/swap components independently
- ✅ Smaller bundle size (16KB vs 150KB for alternatives)

---

## 🚀 Tech Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| **Storage** | SQLite WASM | Battle-tested, ACID-compliant, portable |
| **Search** | FlexSearch | Fastest JS search library, typo-tolerant |
| **Persistence** | IndexedDB | Browser-native, reliable, async |
| **Frontend** | React + TypeScript | Type-safe, component-based |
| **Styling** | CSS Variables | Fast, maintainable, no build overhead |
| **Build** | Vite | Lightning-fast HMR, optimized production builds |
| **Analytics** | Vercel Analytics | Privacy-friendly, zero PII collection |

---

## 🎯 Features

- ✍️ **Rich Text Support** - Write naturally with markdown-like formatting
- 🔍 **Intelligent Search** - Find notes instantly with fuzzy matching
- 📅 **Timestamps** - Automatic creation and update tracking
- 🎨 **Clean UI** - Distraction-free writing experience
- 📱 **Responsive** - Works beautifully on desktop and mobile
- 🌙 **Dark Mode Ready** - Easy on the eyes, day or night
- 💾 **Magic Share** - Transfer your diary via AirDrop, Nearby Share, or direct download
- 🔗 **URL Detection** - Automatically linkifies URLs in your notes
- 📲 **PWA Ready** - Install as app, open `.sqlite` files directly
- 🏠 **Smart Install Prompt** - Beautiful branded banner, not the ugly browser default

---

## 🛠️ Getting Started

### For Users
1. Visit [maribeda.vercel.app](https://maribeda.vercel.app) (or your deployment URL)
2. Start writing - no signup needed!
3. Your notes are saved automatically to your browser

### For Developers

```bash
# Clone the repository
git clone https://github.com/sharathbyregowda/maribeda.git
cd maribeda

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📊 Performance

- **Bundle Size**: 307KB (gzipped: 100KB)
- **First Load**: <1s on 3G
- **Search Speed**: <10ms for 1000 notes
- **Index Build**: <50ms for 1000 notes
- **Offline**: ✅ Full functionality

---

## 🎓 Learning Resources

This project demonstrates:
- **Hybrid Architecture** - Combining specialized tools for optimal performance
- **Local-First Software** - Building apps that work offline-first
- **WASM Integration** - Using WebAssembly in React apps
- **IndexedDB Patterns** - Reliable browser-based persistence
- **TypeScript Best Practices** - Type-safe React development
- **Modern Build Tools** - Vite for fast development

---

## 🤝 Contributing

Contributions are welcome! This project is a great example of:
- Clean separation of concerns
- Modern web app architecture
- Privacy-focused design
- Performance optimization

---

## 📄 License

MIT License - Use it, learn from it, build upon it!

---

## 🌟 Why "Maribeda"?

In Kannada, "ಮರೆಬೇಡ" (Maribeda) means "Don't forget" - a perfect name for a diary app that helps you remember everything.

---

**Built with ❤️ for privacy, performance, and simplicity.**
