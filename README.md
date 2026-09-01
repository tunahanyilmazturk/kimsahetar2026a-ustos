# Sahtekar Kim?

Aynı cihazda oynanan, backend gerektirmeyen PWA sosyal-deduction oyunu.
Oyuncular kelimeyi ve ipuçlarını takip ederek sahtekârı bulmaya çalışır; sahtekâr ise yakalanmadan önce kelimeyi tahmin etmeye çalışır.

## Özellikler

- 3–12 oyuncu desteği (gerçek oyuncu + bot karışık)
- Aynı cihazda gizli rol gösterimi ve cihazı geçirme akışı
- EASY, SMART ve EXPERT botlar (otomatik ipucu, oy ve kelime tahmini)
- 16 kategori ve 223 kelimelik havuz + özel kelime ekleme
- Turlu ipucu sistemi, pas hakkı ve süre sayacı
- Oylama, sahtekârın son kelime tahmini ve sonuç ekranı
- Yerel hesap sistemi (kullanıcı adı/şifre ile giriş/kayıt)
- XP, seviye, coin, günlük + haftalık görev, başarım ve yerel leaderboard
- Market: avatar ve çerçeve satın alma/donatma (sprite-based görseller)
- Sosyal: arkadaş listesi (online davet için placeholder)
- Online oda oluşturma/katılma (backend entegrasyonu bekliyor)
- İlk açılışta tanıtım slaytları (WelcomeIntro)
- LocalStorage ile kalıcı profil ilerlemesi
- PWA: offline çalışma, ana ekrana ekleme, otomatik güncelleme prompt
- Mobil uyumlu, erişilebilir arayüz (high contrast, large text, aria-label, min 44px touch)
- Mobil bottom navigation + quick menu

## Teknoloji

- React 19
- TypeScript 7
- Vite 8
- Tailwind CSS 4
- Motion 13
- Lucide React
- clsx + tailwind-merge
- Vitest 4 + Testing Library 16
- vite-plugin-pwa
- oxlint

## Kurulum

```bash
git clone https://github.com/tunahanyilmazturk/kimsahetar2026a-ustos.git
cd kimsahetar2026a-ustos
npm install
```

## Geliştirme

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

## Doğrulama komutları

```bash
npm run typecheck  # TypeScript kontrolü
npm run lint       # Oxlint (0 uyarı hedefi)
npm test           # 125 test (9 dosya)
npm run build      # Production build ve PWA asset'leri
npm run preview    # Production build önizlemesi
```

## Oyun akışı

```text
LOBBY → REVEAL → PLAYING → VOTING → FINISHED
```

- **LOBBY:** Oyuncular ve botlar eklenir, oda ayarları belirlenir.
- **REVEAL:** Her oyuncu rolünü sırayla görür (sahtekar kelimeyi bilmez, sadece kategori görür).
- **PLAYING:** Oyuncular kelimeyle ilgili ipuçları verir veya pas geçer. Tur süresi vardır.
- **VOTING:** Her oyuncu sahtekâr olduğunu düşündüğü kişiye oy verir.
- **FINISHED:** Sahtekâr açıklanır; yakalandıysa kelimeyi tahmin ederek son şansını kullanır.

## Uygulama akışı

```text
AuthScreen (giriş yoksa)
  → WelcomeIntro (ilk açılış)
    → MainMenuPanel
      → OfflineGame (Oyna) — lazy loaded
      → OnlineLobby (Online Oyna)
```

## Skor sistemi

| Durum | XP | Coin |
|-------|----|------|
| Oyuncu kazanırsa | +50 (+30 bonus) | +30 (+20 bonus) |
| Sahtekar kazanırsa | +70 | +40 |
| Kaybederse | +10 | +5 |

- Level = floor(xp / 100) + 1
- Başlangıç: 100 coin

## Veri ve gizlilik

Uygulama backend kullanmaz. Hesap bilgileri, profil, istatistik, görevler, başarımlar, arkadaş listesi ve leaderboard yalnızca tarayıcının LocalStorage alanında tutulur. Tarayıcı verileri temizlenirse yerel ilerleme de silinir.

## Deployment

Proje GitHub Pages için hazırdır. `main` branch'e push edildiğinde GitHub Actions production build alır ve `dist/` klasörünü Pages'e yayınlar.

GitHub repository ayarlarında bir kez:

1. **Settings → Pages** bölümüne gidin.
2. **Source** olarak **GitHub Actions** seçin.
3. `main` branch'e push edin.

Yayın adresi:

```text
https://tunahanyilmazturk.github.io/kimsahetar2026a-ustos/
```

GitHub Pages alt yolu yalnızca Actions ortamında Vite `base` ayarıyla etkinleşir; local geliştirmede root path kullanılır.

## Proje yapısı

```text
src/
├── components/
│   ├── auth/         # Giriş ekranı ve tanıtım
│   ├── common/       # Button, Modal, Avatar, Toast, Loading
│   ├── menu/         # Menü, profil, market, görev, ayarlar, sosyal
│   └── offline/      # Lobi ve oyun ekranları
├── config/           # Avatar, çerçeve, başarım ve görev tanımları
├── hooks/            # Profil, ayar ve PWA hook'ları
├── lib/              # Storage, profil, skor, auth ve ilerleme API'leri
├── test/             # Unit ve component testleri (125 test)
├── utils/            # Kelime havuzu, bot, oyun mantığı, cn
├── types.ts          # Tüm TypeScript tipleri
├── constants.ts      # 223 kelimelik havuz, 16 kategori
├── OfflineGame.tsx   # Offline oyun state machine
├── OnlineLobby.tsx   # Online oda placeholder
├── App.tsx           # Auth gate + ekran geçişi + PWA update
└── main.tsx          # PWA service worker registration
```

## Testler

9 dosya, 125 test — hepsi geçiyor.

| Dosya | Test sayısı |
|-------|------------|
| wordPool.test.ts | 14 |
| bot.test.ts | 13 |
| profileApi.test.ts | 16 |
| questsApi.test.ts | 7 |
| achievementsApi.test.ts | 5 |
| storage.test.ts | 5 |
| scoreSystem.test.ts | 17 |
| edgeCases.test.ts | 30 |
| OfflineGame.test.tsx | 18 |

## Lisans

Özel proje. Tüm hakları saklıdır.
