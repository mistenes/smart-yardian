# Smart Yardian

Időjárás-alapú, magyar nyelvű öntözésvezérlő Home Assistant 2026.6+ rendszerekhez.

## Funkciók

- több Yardian vezérlő és dinamikusan bővíthető zónalista;
- Yardian-szerű heti programok, soros végrehajtással;
- elsődleges Időkép előrejelzés, OpenWeather One Call API 4.0 fallback;
- átlátható, 0–150%-os időjárási korrekció;
- zónánként választható manuális vagy szórófej-referencia alapján számolt idő;
- programonként opcionális hőmérséklet-feltétel a következő 24 óra
  előrejelzett maximumára;
- rotátor, MP800, spray, rotoros és csepegtető zónaprofil, opcionális
  vízhozam- és területméréssel;
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

## Manuális és referencia idő

A program minden zónájánál két időtartammód választható:

- **Manuális perc:** a beállított percet használja, majd – ha engedélyezett – az
  általános időjárási szorzót alkalmazza.
- **Referencia alapján:** az előrejelzett maximum-hőmérséklethez tartozó
  célzott vízmennyiségből és a zóna kijuttatási intenzitásából számol:
  `perc = cél mm / mm/óra × 60`.

A beépített kiinduló érték rotátornál 10 mm/óra, MP800-nál 20 mm/óra,
spray fejnél 40 mm/óra. A rotoros és csepegtető rendszerek értéke telepítéstől
erősen függ, ezért a panelen minden referencia felülírható. Ha ismert a zóna
teljes vízhozama és az öntözött terület, az alkalmazás ezt használja:
`mm/óra = l/perc × 60 / m²`.

A hőmérsékleti célértékek a megadott táblázat középértékei: 20 °C alatt
2,5 mm, 20–24,9 °C között 4,5 mm, 25–34,9 °C között 5,5 mm, 35 °C-tól
9 mm. Referencia módban az esőkorrekció érvényesül, a meleg miatti szorzó
nem számítódik rá még egyszer.

Gyártói támpont:
[Hunter MP Rotator zónázás](https://www.hunterirrigation.com/support/mp-rotator-zoning),
[Hunter csepegtető kijuttatási intenzitás](https://www.hunterirrigation.com/support/drip-calculating-application-rates).

## Feltételes programok

A programszerkesztőben bekapcsolható a **Hőmérséklet-feltétel**. Például a
`magasabb mint 30 °C` beállításnál a program csak akkor indul el, ha a
következő 24 óra előrejelzett maximuma 30 °C fölött van. Az ellenkező,
`alacsonyabb mint` feltétel is választható. Ha a feltétel nem teljesül, a
futás kihagyásként bekerül az előzményekbe; bizonytalan időjárási adatnál a
biztonsági szabály szerint szintén nem indul el.

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
