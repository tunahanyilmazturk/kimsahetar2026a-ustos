# Sahtekar Kim? — Proje Durum Kaydı

## Genel Bakış
**Sahtekar Kim?** (Who is the Impostor?) — aynı cihazda oynanan + online multiplayer destekli, PWA sosyal-deduction oyunu.
React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion + Supabase + Vitest ile geliştiriliyor.

## Proje Konumu
`sahtekar-kim/` alt dizininde geliştiriliyor.

## GitHub Repo
https://github.com/tunahanyilmazturk/kimsahetar2026a-ustos.git

## Geliştirme Komutları
```bash
cd sahtekar-kim
npm install          # bağımlılıklar
npm run dev          # dev server (localhost:5173 veya 5174)
npm run build        # production build (tsc -b && vite build)
npm run typecheck    # TypeScript tip kontrolü (tsc -b --noEmit)
npm test             # vitest (tek seferlik)
npm test:watch       # vitest watch modu
npm run lint         # oxlint (0 uyarı hedefi)
npm run preview      # build önizleme
```

## Faz Durumu (2026-09-01)

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
| 13 | Test & Polish (lint, edge case testler, erişilebilirlik, performans) | ✅ Tamam |
| 14 | Deployment (GitHub Actions, Pages, bundle splitting) | ✅ Tamam |
| **15** | **Supabase Backend (Auth + DB + Realtime)** | **✅ Tamam** |

## Faz 15: Supabase Backend Entegrasyonu (2026-09-01)
- **Supabase** free tier ile backend eklendi (PostgreSQL + Auth + Realtime)
- **Veritabanı şeması**: 9 tablo (profiles, stats, inventory, achievements, daily_quests, weekly_quests, friends, rooms, room_players, room_chat, room_votes) + leaderboard view + RLS politikaları + realtime yayın
- **Auth**: `authApi` Supabase Auth'a bağlandı — kullanıcı adı `@sahtekar.game` email formatına çevrilir, şifreler hash'lenir, cross-device giriş
- **Profile/Stats/Inventory**: Hybrid yapı — localStorage cache + Supabase sync (fire-and-forget). `syncFromSupabase` login sonrası, `syncToSupabase` her güncellemede
- **Achievements/Quests**: Supabase sync eklendi (günlük + haftalık görevler)
- **Leaderboard**: Yerel + Global mode toggle (LeaderboardModal'da)
- **OnlineLobby**: Gerçek realtime oda senkronizasyonu — oda oluştur/katıl, oyuncu listesi realtime güncelle, hazır durumu, host kontrolü
- **SocialModal**: Supabase friends tablosu — kullanıcı adıyla arkadaş ekle, avatar ile listele, kaldır
- **App.tsx**: Login sonrası otomatik Supabase sync (profile + achievements + quests)
- **.env**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (git'e commit edilmez, `.env.example` template)
- **supabase-schema.sql**: Tam SQL şeması repo'da (Supabase SQL Editor'da çalıştırılır)

## Evde Eklenen Özellikler (Faz 13-14 sonrası)
- **WelcomeIntro**: İlk açılışta 3 slaytlık tanıtım (localStorage `sahtekar:intro-seen`)
- **Haftalık görevler**: `WEEKLY_QUESTS` + `questsApi.getWeekly/addWeeklyProgress/claimWeekly`
- **Sprite-based avatarlar**: `avatar-sprite.png`, `premium-avatar-sprite.png`, `frame-sprite.png` ile CSS background-position
- **Mobil bottom nav**: MainMenuPanel'de sabit alt menü + quick menu (sm:hidden)
- **Görsel varlıklar**: `brand-emblem.png`, `profile-card-bg.png`, `role-duel.png`, `achievement-badges.png`, `profile-level-backgrounds.png`
- **gameUtils.ts**: `countVotes`, `isGuessCorrect`, `isValidHint`, `normalizeText` — test edilebilir saf fonksiyonlar
- **toast-context.ts**: Toast context ayrı dosyaya taşındı (only-export-components lint kuralı)

## Sıradaki Adım: Online oyun mantığı
- OnlineLobby'de "Oyunu Başlat" butonu gerçek oyun state makinesine bağlanacak
- Realtime ile oyun durumu (kelime, sahtekar, oylar) senkronize edilecek
- Her oyuncu kendi cihazında rolünü görecek (cihaz geçirme yerine)
- Oda içi chat realtime olacak

## Mimari Özet

### Teknoloji Stack
- React 19.2.x, TypeScript 7.0.x, Vite 8.2.x
- Tailwind CSS 4.3.x, Motion 13.1.x, Lucide React 1.38.x
- **Supabase** (PostgreSQL + Auth + Realtime) — @supabase/supabase-js
- clsx, tailwind-merge
- Vitest 4.1.x, Testing Library 16.3.x, jsdom 30.x
- vite-plugin-pwa 1.3.x (PWA), sharp (icon üretimi)
- oxlint 1.79.x (lint)

### Backend (Supabase)
- **Project**: `kimsahetar2026` (Asia-Pacific, Free tier)
- **URL**: `https://xjzsuyzpbzlplnmlsyvu.supabase.co`
- **Auth**: Email/password (username → `username@sahtekar.game` formatında)
- **Tablolar**: profiles, stats, inventory, achievements, daily_quests, weekly_quests, friends, rooms, room_players, room_chat, room_votes
- **View**: leaderboard (profiles + stats join)
- **RLS**: Her tabloda Row Level Security aktif (kullanıcı sadece kendi verisini değiştirir)
- **Realtime**: rooms, room_players, room_chat, room_votes tabloları realtime yayın için eklendi
- **Trigger**: Yeni kullanıcı signup'da otomatik profile + stats + inventory oluşturur
- **Şema dosyası**: `supabase-schema.sql` (repo'da, Supabase SQL Editor'da çalıştırılır)
- **Env**: `.env` (git'e commit edilmez), `.env.example` (template)

### Dizin Yapısı
```
sahtekar-kim/
├── .github/workflows/deploy.yml   # CI: typecheck+lint+test+build+Pages deploy
├── .oxlintrc.json                 # oxlint config (react, typescript plugins)
├── public/                        # favicon, icon'lar, sprite PNG'ler
│   ├── favicon.svg, icon.svg, icons.svg
│   ├── icon-192.png, icon-512.png, icon-32.png, apple-touch-icon.png
│   ├── avatar-sprite.png          # 4x4 grid (16 avatar)
│   ├── premium-avatar-sprite.png  # 4x4 grid (8 premium avatar)
│   ├── frame-sprite.png           # 4x4 grid (16 çerçeve)
│   ├── achievement-badges.png     # 4x4 grid (16 başarım rozeti)
│   ├── brand-emblem.png           # Logo
│   ├── profile-card-bg.png        # Profil kartı arka planı
│   ├── profile-level-backgrounds.png
│   └── role-duel.png              # Reveal/Finished ekran görseli
├── src/
│   ├── components/
│   │   ├── auth/                  # AuthScreen, WelcomeIntro
│   │   ├── common/                # Button, Avatar, Modal, Toast, toast-context, Loading
│   │   ├── menu/                  # MainMenuPanel, MarketProfileModal, AchievementsModal,
│   │   │                          # DailyQuestsModal, LeaderboardModal, SettingsModal, SocialModal
│   │   └── offline/               # LobbyScreen, RevealScreen, PlayingScreen,
│   │                              # VotingScreen, FinishedScreen, ChatPanel,
│   │                              # PlayerList, RoomSettingsModal
│   ├── config/                    # achievements, avatarFrames, customShopAvatars, dailyQuests
│   ├── hooks/                     # useProfile, useSettings, usePwaInstall
│   ├── lib/                       # profileApi, questsApi, achievementsApi, scoreSystem, storage, authApi
│   ├── test/                      # 9 test dosyası, 125 test
│   ├── utils/                     # wordPool, bot, gameUtils, cn
│   ├── types.ts                   # tüm TypeScript tipleri
│   ├── constants.ts               # 223 kelimelik havuz, 16 kategori
│   ├── OfflineGame.tsx            # state makinesi (LOBBY|REVEAL|PLAYING|VOTING|FINISHED)
│   ├── OnlineLobby.tsx            # online oda placeholder
│   ├── App.tsx                    # ekran geçişi (menu|game|online) + auth gate + PWA update
│   ├── main.tsx                   # PWA SW registration
│   └── index.css                  # Tailwind + custom animations + erişilebilirlik
├── vite.config.ts                 # VitePWA + manualChunks (react-vendor, motion)
├── vitest.config.ts               # jsdom + setup
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
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

### App Akışı
```
AuthScreen (giriş yoksa)
  → WelcomeIntro (ilk açılış)
    → MainMenuPanel (menu)
      → OfflineGame (game) — lazy loaded
      → OnlineLobby (online)
```

### Veri Akışı
- **Hybrid**: localStorage cache + Supabase sync (offline-first)
- `authApi` → Supabase Auth (kullanıcı adı/şifre, cross-device session)
- `profileApi` → localStorage + Supabase sync (profile, stats, inventory, leaderboard, settings)
- `questsApi` → localStorage + Supabase sync (günlük + haftalık görevler)
- `achievementsApi` → localStorage + Supabase sync (başarım kontrolü + ödüller)
- `scoreSystem.applyGameResult` → oyun sonunda XP/coin/stats/leaderboard günceller
- `supabase.ts` → Supabase client (auth, realtime, db)
- Login sonrası: `syncFromSupabase` ile cloud'dan yerel cache'e veri çekilir
- Her güncellemede: `syncToSupabase` ile cloud'a fire-and-forget yazılır

### Bot Sistemi
- `bot.ts` → EASY/SMART/EXPERT davranışları
- Playing: otomatik ipucu (1.5-3sn gecikme)
- Voting: otomatik oy (1-2.5sn gecikme)
- Finished: otomatik kelime tahmini (2-4sn gecikme, sahtekar yakalandıysa)
- Sahtekar bot: kelimeyi bilmez, diğer ipuçlarından çıkarsamaya çalışır

### Test Durumu
- 9 test dosyası, 125 test — hepsi geçiyor
- wordPool.test (14), bot.test (13), profileApi.test (16), questsApi.test (7),
  achievementsApi.test (5), storage.test (5), scoreSystem.test (17),
  edgeCases.test (30), OfflineGame.test.tsx (18)

### Kelime Havuzu
- 223 kelime, 16 kategori (Seyahat, Kamp, Müzik, Yiyecek, Spor, Doğa, Meslek,
  Ev Eşyaları, Giyim, Teknoloji, Hayvanlar, Taşıtlar, Filmler, Bilim,
  İçecekler, Tarih)
- Her kategori ~14 kelime (EASY/MEDIUM/HARD dağılımı)

### Skor Sistemi
- WIN_AS_PLAYER: +50 XP, +30 coin (+30/+20 catch bonus)
- WIN_AS_IMPOSTOR: +70 XP, +40 coin
- LOSE: +10 XP, +5 coin
- Level = floor(xp / 100) + 1
- Başlangıç: 100 coin

### PWA
- vite-plugin-pwa (autoUpdate, Workbox)
- manifest.webmanifest (standalone, portrait, tr)
- Service Worker (offline cache, StaleWhileRevalidate, 30 gün, 5MB max)
- Icon'lar: 192/512 PNG (maskable), apple-touch-icon
- usePwaInstall hook (beforeinstallprompt)
- PWA update prompt (App.tsx — "Yeni sürüm hazır" toast + yenile butonu)

### Build Çıktısı
- react-vendor: 181 kB (57 kB gzip)
- motion: 132 kB (43 kB gzip)
- index: 127 kB (35 kB gzip)
- OfflineGame (lazy): 72 kB (18 kB gzip)
- CSS: 79 kB (12 kB gzip)
- Toplam ~520 kB JS / ~150 kB gzip

## Önemli Notlar
- **Backend**: Supabase (free tier) — Auth + PostgreSQL + Realtime
- **Online multiplayer**: Oda oluşturma/katılma + realtime oyuncu listesi aktif. Oyun mantığı (kelime dağıtım, oylama) henüz realtime değil.
- **Offline-first**: Supabase bağlantısı olmasa bile localStorage ile çalışır
- Capacitor/mobile YOK — PWA olarak çalışır
- Tüm UI Türkçe
- Tüm testler geçiyor (125/125)
- Build başarılı (~610 kB JS / ~190 kB gzip — Supabase client dahil)
- Lint temiz (0 uyarı, 0 hata — oxlint)
- qrcode.react kaldırıldı (kullanılmıyordu)

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
npm test           # 125 test geçiyor mu kontrol et
npm run lint       # 0 uyarı kontrol et (oxlint)
npm run build      # build başarılı mı kontrol et
```

### 3. Kaldığımız Yer: Yayın sonrası kontrol
**Tüm 14 faz tamamlandı.** Geriye yayın sonrası kontroller kaldı:

- GitHub Actions workflow'u `main` push'larında build ve Pages deploy başlatır.
- İlk kullanım öncesi repository Settings → Pages → Source: GitHub Actions seçilmelidir.
- Yayın sonrası PWA install, offline cache ve mobil görünüm gerçek cihazda kontrol edilmelidir.

### 4. Devin ile Devam Etmek İçin
Devin CLI'da projeyi aç ve şunu söyle:
> "AGENTS.md'yi oku, [yapmak istediğin şey]"

Devin AGENTS.md'yi okuyacak, mevcut durumu anlayacak ve istediğin işi sürdürecek.

### 5. Commit ve Push Pattern
Her faz/özellik bitiminde:
```bash
git add -A
git commit -m "Faz X: ..."
git push
```

### 6. Dosya Yapısı Hakkında Hızlı Not
- `src/OfflineGame.tsx` — ana oyun state makinesi (burayı anlamak önemli)
- `src/App.tsx` — auth gate + ekran geçişi (menu|game|online) + PWA update
- `src/components/offline/` — tüm oyun ekranları
- `src/components/menu/` — ana menü ve modal'lar
- `src/components/auth/` — giriş ekranı ve tanıtım
- `src/lib/` — API katmanı (profileApi, questsApi, achievementsApi, scoreSystem, authApi, storage)
- `src/utils/` — wordPool (kelime seçimi), bot (bot davranışları), gameUtils (oyun mantığı)
- `src/config/` — sabit veriler (kelimeler, başarımlar, avatarlar, çerçeveler, görevler)
- `src/types.ts` — tüm TypeScript tipleri
- `src/constants.ts` — 223 kelimelik havuz, 16 kategori
