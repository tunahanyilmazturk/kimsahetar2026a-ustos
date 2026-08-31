# Sahtekar Kim?

Aynı cihazda oynanan, backend gerektirmeyen PWA sosyal-deduction oyunu.
Oyuncular kelimeyi ve ipuçlarını takip ederek sahtekârı bulmaya çalışır; sahtekâr ise yakalanmadan önce kelimeyi tahmin etmeye çalışır.

## Özellikler

- 3–12 oyuncu desteği
- Aynı cihazda gizli rol gösterimi ve cihazı geçirme akışı
- EASY, SMART ve EXPERT botlar
- 12 kategori ve 204 kelimelik havuz
- Özel kelime ekleme
- Turlu ipucu sistemi, pas hakkı ve süre sayacı
- Oylama, sahtekârın son kelime tahmini ve sonuç ekranı
- XP, seviye, coin, görev, başarım ve yerel leaderboard sistemi
- LocalStorage ile kalıcı profil ilerlemesi
- PWA ve offline çalışma desteği
- Mobil uyumlu ve erişilebilir arayüz

## Teknoloji

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- Motion
- Lucide React
- Vitest + Testing Library
- vite-plugin-pwa

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
npm run lint       # Oxlint
npm test           # 124 test
npm run build      # Production build ve PWA asset'leri
npm run preview    # Production build önizlemesi
```

## Oyun akışı

```text
LOBBY → REVEAL → PLAYING → VOTING → FINISHED
```

- **LOBBY:** Oyuncular ve oda ayarları belirlenir.
- **REVEAL:** Her oyuncu rolünü sırayla görür.
- **PLAYING:** Oyuncular kelimeyle ilgili ipuçları verir veya pas geçer.
- **VOTING:** Her oyuncu sahtekâr olduğunu düşündüğü kişiye oy verir.
- **FINISHED:** Sahtekâr açıklanır; yakalandıysa kelimeyi tahmin ederek son şansını kullanır.

## Veri ve gizlilik

Uygulama backend kullanmaz. Profil, istatistik, görevler, başarımlar ve leaderboard yalnızca tarayıcının LocalStorage alanında tutulur. Tarayıcı verileri temizlenirse yerel ilerleme de silinir.

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
│   ├── common/       # Button, Modal, Avatar, Toast
│   ├── menu/         # Menü, profil, market, görev ve ayarlar
│   └── offline/      # Lobi ve oyun ekranları
├── config/            # Avatar, frame, başarım ve görev tanımları
├── hooks/             # Profil, ayar ve PWA hook'ları
├── lib/               # Storage, profil, skor ve ilerleme API'leri
├── test/              # Unit ve component testleri
├── utils/             # Kelime havuzu, bot ve oyun yardımcıları
├── OfflineGame.tsx    # Offline oyun state machine'i
└── App.tsx            # Menü/oyun ekran geçişi
```
