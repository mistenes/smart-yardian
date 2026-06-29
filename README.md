# Smart Yardian

Időjárás-alapú, magyar nyelvű öntözésvezérlő Home Assistant 2026.6+ rendszerekhez.

## Funkciók

- több Yardian vezérlő és dinamikusan bővíthető zónalista;
- Yardian-szerű heti programok, soros végrehajtással;
- elsődleges Időkép előrejelzés, OpenWeather One Call API 4.0 fallback;
- átlátható, 0–150%-os időjárási korrekció;
- zónánként választható manuális vagy szórófej-referencia alapján számolt idő;
- programonként opcionális hőmérséklet-feltétel a program naptári napjának
  előrejelzett maximumára;
- külön háromnapos előnézet a várható futásokkal, kihagyásokkal és
  zónánként számolt időkkel;
- rotátor, MP800, spray, rotoros és csepegtető zónaprofil, opcionális
  vízhozam- és területméréssel;
- napos vagy árnyékos területjelleg, amely referencia módban módosítja az időt;
- Home Assistant/Zigbee talajnedvességmérő hozzárendelése egy, több vagy minden
  zónához, programonkénti engedélyezésre előkészítve;
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

Napos területnél a táblázat szerinti 100%-os célmennyiséget használjuk.
Árnyékos területnél a kisebb párolgás miatt a referenciaidő 80%-ra csökken.
Ez a korrekció csak a **Referencia alapján** módot érinti; a kézzel megadott
percet nem írja felül.

A zónákhoz Home Assistant `sensor.*` talajnedvesség-entitás rendelhető.
Ugyanaz az érzékelő több vagy a „Hozzárendelés mindhez” művelettel minden
zónához használható. A programban külön engedélyezhető a zónák érzékelőinek
használata. Ebben a verzióban a hozzárendelés és az aktuális érték megjelenítése
kész; automatikus kihagyás még nem történik, amíg nincs külön megadott,
ellenőrizhető nedvességi küszöb.

A hőmérsékleti célértékek a megadott táblázat középértékei: 20 °C alatt
2,5 mm, 20–24,9 °C között 4,5 mm, 25–34,9 °C között 5,5 mm, 35 °C-tól
9 mm. Referencia módban az esőkorrekció érvényesül, a meleg miatti szorzó
nem számítódik rá még egyszer.

Gyártói támpont:
[Hunter MP Rotator zónázás](https://www.hunterirrigation.com/support/mp-rotator-zoning),
[Hunter csepegtető kijuttatási intenzitás](https://www.hunterirrigation.com/support/drip-calculating-application-rates).

## Feltételes programok

A programszerkesztőben bekapcsolható a **Hőmérséklet-feltétel**. Például a
`magasabb mint 30 °C` beállításnál a program csak akkor indul el, ha a program
naptári napjának előrejelzett maximuma 30 °C fölött van. Az ellenkező,
`alacsonyabb mint` feltétel is választható. Ha a feltétel nem teljesül, a
futás kihagyásként bekerül az előzményekbe; bizonytalan időjárási adatnál a
biztonsági szabály szerint szintén nem indul el.

## Következő 3 nap

A felső **Következő 3 nap** fül a következő három naptári nap még hátralévő
programjait számolja ki. Megjeleníti a várható futást vagy kihagyást, az
időjárásforrást, a maximum-hőmérsékletet, a csapadékot, a zónánkénti perceket
és a teljes futási időt. Az előnézet figyelembe veszi az automatika állapotát,
a szüneteltetést, a `skip next` jelölést, az esőkorrekciót és a
hőmérséklet-feltételt. A számítás csak előnézet, nem indít Yardian zónát.

Távolabbi napnál csak akkor jelenik meg konkrét futási idő, ha az Időkép vagy
az OpenWeather legalább 12 használható órát ad az adott program időpontjától.

## OpenWeather híváskorlát

Az OpenWeather-válasz 30 percig gyorsítótárazott, ezért normál működésben
legfeljebb 48 valódi kérés történhet naponta. Ezen felül egy HA-szinten közös,
tartós számláló minden valódi HTTP-kérés előtt lefoglal egy hívást. A 200.
hívás után további OpenWeather-kérés az adott UTC-napon nem indul el, HA
újraindítása után sem. A mai felhasználás a **Beállítások** oldalon látható.

## Ha a Yardian zóna „Nem elérhető”

A panel a natív Home Assistant Yardian switch entity-k állapotát mutatja. Ha
egy zóna mellett `Nem elérhető · HA: unavailable` látszik, akkor a Smart
Yardian nem kap indítható zónaállapotot a beépített Yardian integrációtól, ezért
biztonsági okból tiltja a kézi és automatikus indítást.

Ellenőrzési sorrend:

1. A Home Assistant **Yardian** integrációjában a vezérlő online-e.
2. A kiválasztott zóna entity-k állapota nem `unavailable`-e a Fejlesztői
   eszközök → Állapotok nézetben.
3. A Smart Yardian újrakonfigurálásánál valóban a Yardian zóna `switch.*`
   entitások vannak-e kiválasztva.
4. A Yardian saját felhős/lokális kapcsolatának javítása után indítsd újra vagy
   töltsd újra a Yardian integrációt, majd frissítsd a Smart Yardian panelt.

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
