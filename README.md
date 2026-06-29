# Smart Yardian

Időjárás-alapú, magyar nyelvű öntözésvezérlő Home Assistant 2026.6+ rendszerekhez.

## Funkciók

- több Yardian vezérlő és dinamikusan bővíthető zónalista;
- Yardian-szerű heti programok, soros végrehajtással;
- elsődleges Időkép előrejelzés, OpenWeather One Call API 4.0 fallback;
- átlátható, 0–150%-os időjárási korrekció;
- megszakítás-, újraindítás- és párhuzamos futás elleni védelem;
- automatikusan regisztrált, reszponzív Home Assistant oldalsó panel;
- Home Assistant műveletek és állapotentitások külső automatizálásokhoz.

## Telepítés

1. A két Yardian vezérlőt add hozzá a Home Assistant beépített **Yardian**
   integrációjával, majd kapcsold ki a Yardian saját időzített programjait.
2. HACS-ban add hozzá ezt a repositoryt egyéni integrációként, majd telepítsd.
3. Telepítsd és állítsd be az
   [Időkép integrációt](https://github.com/rinyakok/homeassistant_idokep).
4. Aktiváld az OpenWeather **One Call by Call 4.0** csomagot, és készíts API-kulcsot.
5. Indítsd újra a Home Assistantot, majd a **Beállítások → Eszközök és
   szolgáltatások → Integráció hozzáadása** menüben válaszd a **Smart Yardian**
   integrációt.
6. Válaszd ki az Időkép weather entitást, a Yardian zónákat, és add meg az
   OpenWeather API-kulcsot.

Az integráció ezután **Öntözés** néven megjelenik az oldalsávban.

## Fejlesztés

```bash
npm install
npm run build
npm test
python -m pytest
```

Az `npm run build` a kész panelt közvetlenül a
`custom_components/smart_yardian/frontend/` könyvtárba írja.

## Biztonsági működés

Az automatikus programok globális sorban futnak, ezért egyszerre csak egy zóna
lehet aktív. Ha egyik időjárásforrás sem használható, automatikus öntözés nem
indul. Kézi zónaindítás ilyenkor is elérhető.

## Licenc

MIT
