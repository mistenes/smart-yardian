# Smart Yardian

Időjárás-alapú, magyar nyelvű öntözésvezérlő Home Assistant 2026.6+ rendszerekhez.

## Funkciók

- több Yardian vezérlő és dinamikusan bővíthető zónalista;
- Yardian-szerű heti programok, soros végrehajtással;
- egységes, kizárólag Időkép-alapú napi előrejelzés;
- a Smart Yardian beállításaiból módosítható Időkép-előrejelzési település;
- település alapján kiválasztható közeli Időkép automata, amelynek elmúlt
  24 órás mért csapadéka beleszámít az öntözési döntésbe;
- átlátható, 0–150%-os időjárási korrekció;
- Hargreaves–Samani napi ET0-becslés az Időkép hőmérsékleteiből, a HA
  helyadataiból, naposság/felhőzet- és szélkorrekcióval;
- zónánként választható manuális vagy szórófej-referencia alapján számolt idő;
- programonként opcionális hőmérséklet-feltétel a program naptári napjának
  előrejelzett maximumára;
- külön háromnapos előnézet a várható futásokkal, kihagyásokkal és
  zónánként számolt időkkel;
- külön órás Időkép-előrejelzés hőmérséklettel, csapadékmennyiséggel és
  csapadékeséllyel;
- rotátor, MP800, spray, rotoros és csepegtető zónaprofil, opcionális
  vízhozam- és területméréssel;
- napos vagy árnyékos területjelleg, amely referencia módban módosítja az időt;
- Home Assistant/Zigbee talajnedvességmérő hozzárendelése egy, több vagy minden
  zónához, programonkénti engedélyezésre előkészítve;
- futás közben minden nézetből elérhető sticky állapotsáv program- és
  kör-visszaszámlálóval, előző/aktuális/következő körrel, körkihagyással és
  azonnali leállítással;
- egyszer futó, többkörös kézi program összeállítása, napi programból történő
  importálással, átrendezhető körökkel és manuális vagy referencia időkkel;
- megszakítás-, újraindítás- és párhuzamos futás elleni védelem;
- automatikusan regisztrált, reszponzív Home Assistant oldalsó panel;
- Home Assistant műveletek és állapotentitások külső automatizálásokhoz.

## Telepítés

1. A két Yardian vezérlőt add hozzá a Home Assistant beépített **Yardian**
   integrációjával, majd kapcsold ki a Yardian saját időzített programjait.
2. HACS-ban add hozzá ezt a repositoryt egyéni integrációként, majd telepítsd.
3. Telepítsd és állítsd be az
   [Időkép integrációt](https://github.com/rinyakok/homeassistant_idokep).
4. Indítsd újra a Home Assistantot, majd a **Beállítások → Eszközök és
   szolgáltatások → Integráció hozzáadása** menüben válaszd a **Smart Yardian**
   integrációt.
5. Válaszd ki az Időkép weather entitást és a Yardian zónákat.

Az integráció ezután **Öntözés** néven megjelenik az oldalsávban.

## Manuális és referencia idő

A program minden zónájánál két időtartammód választható:

- **Manuális perc:** a beállított percet használja, majd – ha engedélyezett – az
  általános időjárási szorzót alkalmazza.
- **Referencia alapján:** a becsült napi párolgásból, a gyep növényi
  együtthatójából és a zóna kijuttatási intenzitásából számol:
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

Alapbeállításként a napi referencia-párolgás 5 mm, a gyep növényi együtthatója
(`Kc`) 0,85. A referencia mód célja: `korrigált ET0 × Kc × területjelleg ×
esőszorzó`. A manuális perces mód ugyanezt az ET0-t az 5 mm-es
referenciaértékhez viszonyított időjárási szorzóként használja. A régi
hőmérsékleti céltábla kikapcsolt ET-számításnál kompatibilitási tartalék marad.

Az ET0 Hargreaves–Samani-becslésből készül a napi minimum, maximum és
átlaghőmérséklettel. Az elméleti napsugárzást a dátum és a Home Assistantban
beállított földrajzi szélesség adja; a végeredményt az Időkép felhőzet/naposság
adata 0,75–1,10 között, a szél pedig legfeljebb +15%-kal módosítja. Ez még nem
többnapos talaj-vízmérleg: minden program az adott nap előrejelzését használja.

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

Egy naptári nap minden programja közös napi időjárási döntést használ. A
számítás kizárólag az adott helyi naptári naphoz tartozó Időkép-órákat veszi
figyelembe, a következő nap adatait nem. Ha az adott naphoz egyetlen használható
órás rekord sincs, az időjárásfüggő program biztonsági okból nem indul el.

Távolabbi napnál csak akkor jelenik meg konkrét futási idő, ha az Időkép
ad használható órás előrejelzést az adott naptári naphoz.

## Lehullott csapadék Időkép automatából

A **Beállítások → Lehullott csapadék · Időkép automata** részen add meg a
település nevét, keresd meg a környékbeli automatákat, válaszd ki a megfelelőt,
majd mentsd a beállításokat. A Smart Yardian az Időkép nyilvános
[24 órás csapadéktérképéből](https://www.idokep.hu/csapadek) olvassa ki az
automata mért értékét, legfeljebb óránként egyszer.

A panel külön mutatja az elmúlt 24 órában mért és a még várható csapadékot.
Az eső miatti csökkentés és kihagyás a két érték összegét használja. A mért
érték csak a mai nap döntéséhez kerül hozzá; a következő napok előnézetéhez
nem vetítjük előre. A radaros becslés ellenőrzésként látható, de a számítás a
kiválasztott automata mérését használja. Ez közeli állomásadat, ezért nem
azonos pontosságú egy saját, kertben elhelyezett esőmérővel.

## Előrejelzési település

A **Beállítások → Időkép előrejelzés** részen közvetlenül megadható az a
település, amelynek órás előrejelzését és napi maximum-hőmérsékletét a Smart
Yardian használja. Mentés előtt a rendszer ellenőrzi, hogy az Időkép ad-e
órás előrejelzést a településhez, majd átállítja és újratölti a kiválasztott
Időkép-integrációt. Az előrejelzés települése és a mért csapadékhoz használt
közeli automata külön beállítás.

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
