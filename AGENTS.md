# Sahtekar Kim? — Proje Durum Kaydı

## Genel Bakış
**Sahtekar Kim?** (Who is the Impostor?) — aynı cihazda oynanan, backend'siz, PWA sosyal-deduction oyunu.
React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion + Vitest ile geliştiriliyor.

## Proje Konumu
`sahtekar-kim/` alt dizininde geliştiriliyor.

## GitHub Repo
https://github.com/tunahanyilmazturk/kimsahetar2026a-ustos.git

## Geliştirme Komutları
```bash
cd sahtekar-kim
npm install          # bağımlılıklar
npm run dev          # dev server (localhost:5173 veya 5174)
npm run build        # production build
npm run typecheck    # TypeScript tip kontrolü
npm test             # vitest (tek seferlik)
npm test:watch       # vitest watch modu
npm run preview      # build önizleme
```

## Faz Durumu (2026-08-31)

| Faz | Açıklama | Durum |
|-----|----------|-------|
| 1 | Temel Kurulum (Vite, React, TS, Tailwind, Motion) | ✅ Tamam |
| 2 | Temel Veri Modeli (types, config, API layer) | ✅ Tamam |
| 3 | Yerel Profil (Button, Avatar, Modal, Toast, useProfile) | ✅ Tamam |
| 4 | Ana Menü (MainMenuPanel, Settings, Leaderboard, PWA install) | ✅ Tamam |
| 5 | Offline Oyun Çekirdeği (kelime havuzu, Lobby, Reveal, RoomSettings) | ✅ Tamam |
| 6 | Oyun İçi (PlayingScreen, ChatPanel, PlayerList, timer, pas) | ✅ Tamam |
| 7 | Oylama & Sonuç (VotingScreen, FinishedScreen, skor/XP/coin) | ✅ Tamam |
| 8 | Botlar (EASY/SMART/EXPERT, otomatik ipucu/oy/tahmin) | ✅ Tamam |
| 9 | Market & Başarımlar (AchievementsModal, MarketProfileModal sekme) | ✅ Tamam |
| 10 | Günlük Görevler (DailyQuestsModal, ödül talebi, rozet) | ✅ Tamam |
| 11 | Yerel Liderlik (LeaderboardModal geliştirildi, otomatik kayıt) | ✅ Tamam |
| 12 | PWA (vite-plugin-pwa, manifest, service worker, offline) | ✅ Tamam |
| **13** | **Test & Polish** | **⏳ SIRADAKİ** |
| 14 | Deployment | ⏳ Bekliyor |

## Sıradaki Adım: Faz 13 — Test & Polish
- Ek unit testler (scoreSystem, OfflineGame state geçişleri)
- Edge case'ler (0 oyuncu, 1 oyuncu, tüm pas, berabere oylama)
- UI polish (animasyonlar, geçişler, responsive)
- Erişilebilirlik (aria-label, klavye navigasyonu, renk kontrastı)
- Performans (memoization, bundle analizi)
- Lint (oxlint)

## Mimari Özet

### Teknoloji Stack
- React 19.2.x, TypeScript 7.0.x, Vite 8.2.x
- Tailwind CSS 4.3.x, Motion 13.1.x, Lucide React
- qrcode.react, clsx, tailwind-merge
- Vitest, Testing Library, jsdom
- vite-plugin-pwa (PWA), sharp (icon üretimi)

### Dizin Yapısı
```
sahtekar-kim/
├── public/              # favicon, icon'lar (SVG + PNG)
├── src/
│   ├── components/
│   │   ├── common/      # Button, Avatar, Modal, Toast, Loading
│   │   ├── menu/        # MainMenuPanel, MarketProfileModal, AchievementsModal,
│   │   │                # DailyQuestsModal, LeaderboardModal, SettingsModal
│   │   └── offline/     # LobbyScreen, RevealScreen, PlayingScreen,
│   │                    # VotingScreen, FinishedScreen, ChatPanel,
│   │                    # PlayerList, RoomSettingsModal
│   ├── config/          # achievements, avatarFrames, customShopAvatars, dailyQuests
│   ├── hooks/           # useProfile, useSettings, usePwaInstall
│   ├── lib/             # profileApi, questsApi, achievementsApi, scoreSystem, storage
│   ├── test/            # wordPool.test, bot.test, profileApi.test, ...
│   ├── utils/           # wordPool, bot, cn
│   ├── types.ts         # tüm TypeScript tipleri
│   ├── constants.ts     # 204 kelimelik havuz, 12 kategori
│   ├── OfflineGame.tsx  # state makinesi (LOBBY|REVEAL|PLAYING|VOTING|FINISHED)
│   ├── App.tsx          # ekran geçişi (menu|game)
│   └── main.tsx         # PWA SW registration
├── vite.config.ts       # VitePWA plugin
└── package.json
```

### Oyun Akışı
```
LOBBY → REVEAL → PLAYING → VOTING → FINISHED
  │                                    │
  │  oyuncu/bot ekle, ayarlar           ├─ REVEAL (sahtekar açıklanır)
  │                                    ├─ GUESS (sahtekar kelime tahmini)
  │                                    └─ RESULT (kazanan + ödüller + tekrar oyna)
```

### Veri Akışı
- `localStorage` (storage.ts abstraction)
- `profileApi` → profile, stats, inventory, leaderboard, settings
- `questsApi` → günlük görevler (tarih bazlı sıfırlama)
- `achievementsApi` → başarım kontrolü
- `scoreSystem.applyGameResult` → oyun sonunda XP/coin/stats/leaderboard günceller

### Bot Sistemi
- `bot.ts` → EASY/SMART/EXPERT davranışları
- Playing: otomatik ipucu (1.5-3sn gecikme)
- Voting: otomatik oy (1-2.5sn gecikme)
- Finished: otomatik kelime tahmini (2-4sn gecikme, sahtekar yakalandıysa)

### Test Durumu
- 7 test dosyası, 64 test — hepsi geçiyor
- wordPool.test (14), bot.test (13), profileApi.test, questsApi.test, achievementsApi.test, ...

### Kelime Havuzu
- 204 kelime, 12 kategori (Seyahat, Kamp, Müzik, Yiyecek, Spor, Doğa, Meslek,
  Ev Eşyaları, Giyim, Teknoloji, Hayvanlar, Taşıtlar)
- Her kategori 17 kelime (EASY/MEDIUM/HARD dağılımı)

### PWA
- vite-plugin-pwa (autoUpdate, Workbox)
- manifest.webmanifest (standalone, portrait, tr)
- Service Worker (offline cache, StaleWhileRevalidate, 30 gün)
- Icon'lar: 192/512 PNG (maskable), apple-touch-icon
- usePwaInstall hook (beforeinstallprompt)

## Önemli Notlar
- Backend YOK — tüm veriler localStorage'da
- Online multiplayer YOK — aynı cihaz pass-device pattern
- Capacitor/mobile YOK — PWA olarak çalışır
- Tüm UI Türkçe
- Tüm testler geçiyor (64/64)
- Build başarılı (~469 kB JS / 140 kB gzip)

---

## 🏠 Evde Devam Etme Talimatları

### 1. Projeyi İndir
```bash
git clone https://github.com/tunahanyilmazturk/kimsahetar2026a-ustos.git
cd kimsahetar2026a-ustos
npm install
```

### 2. Çalıştır ve Doğrula
```bash
npm run dev        # dev server başlat → http://localhost:5173
npm run typecheck  # hata yok mu kontrol et
npm test           # 64 test geçiyor mu kontrol et
npm run build      # build başarılı mı kontrol et
```

### 3. Kaldığımız Yer: Faz 13 — Test & Polish
**Faz 12 (PWA) tamamlandı. Sıradaki Faz 13.**

Faz 13'de yapılacaklar:
- Ek unit testler: `scoreSystem.test.ts` genişlet, `OfflineGame` state geçişleri için test
- Edge case'ler: 0 oyuncu, 1 oyuncu, tüm oyuncular pas, berabere oylama
- UI polish: animasyon geçişleri, mobile responsive iyileştirmeleri
- Erişilebilirlik: `aria-label` eksikleri, klavye navigasyonu, renk kontrastı
- Performans: `useMemo`/`useCallback` gözden geçirme, bundle analizi
- Lint: `npm run lint` (oxlint) çalıştır, uyarıları düzelt

### 4. Devin ile Devam Etmek İçin
Devin CLI'da projeyi aç ve şunu söyle:
> "AGENTS.md'yi oku, Faz 13 — Test & Polish'e başla"

Devin AGENTS.md'yi okuyacak, mevcut durumu anlayacak ve Faz 13'e başlayacak.

### 5. Commit ve Push Pattern
Her faz bitiminde:
```bash
git add -A
git commit -m "Faz X: ..."
git push
```

### 6. Dosya Yapısı Hakkında Hızlı Not
- `src/OfflineGame.tsx` — ana oyun state makinesi (burayı anlamak önemli)
- `src/components/offline/` — tüm oyun ekranları
- `src/components/menu/` — ana menü ve modal'lar
- `src/lib/` — API katmanı (profileApi, questsApi, achievementsApi, scoreSystem)
- `src/utils/` — wordPool (kelime seçimi), bot (bot davranışları)
- `src/config/` — sabit veriler (kelimeler, başarımlar, avatarlar, görevler)
- `src/types.ts` — tüm TypeScript tipleri
