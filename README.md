# Fourier Çizim Makinesi

Fareyle çizdiğin herhangi bir şekli, sabit hızlarla dönen çemberlerin (episaykılların)
toplamı olarak yeniden çizen interaktif bir **Fourier serisi** oyun alanı. 3Blue1Brown'un
ünlü videolarındaki fikrin sıfır bağımlılıklı, saf JavaScript uygulaması.

**Canlı:** https://hakanatas.github.io/fourier-cizim-makinesi/

## Nasıl çalışır?

1. Kanvasa fareyle (veya dokunarak) kapalı bir şekil çiz — ya da hazır şekillerden birini seç
   (kalp, yıldız, kelebek, sonsuz).
2. Çizim, eşit yay uzunluklu 512 noktaya yeniden örneklenir ve **ayrık Fourier dönüşümü** (DFT)
   ile karmaşık katsayılara ayrıştırılır.
3. Katsayılar genliğe göre sıralanır; her biri kendi frekansında dönen bir çember olur ve
   uç uca eklenen çemberlerin ucundaki "kalem" şekli yeniden çizer.

## Özellikler

- **Terim sayısı kaydırıcısı (1–200):** az çemberle yumuşak taslak, çok çemberle keskin ayrıntı —
  Fourier serisinin yakınsamasını canlı izle.
- **Benzerlik puanı:** seçili terim sayısıyla yeniden çizimin aslına ne kadar yaklaştığını
  % olarak gösterir (az terimle en yüksek benzerliği yakalamaya çalış!).
- Hız kaydırıcısı, çember ve orijinal iz aç/kapat düğmeleri.
- Dokunmatik ekran desteği.

## Çalıştırma

Statik dosyalar — herhangi bir sunucu yeterli:

```bash
python3 -m http.server 8318
```
