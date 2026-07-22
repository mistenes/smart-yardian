# Smart Yardian

Időjárás-alapú, magyar nyelvű öntözésvezérlő Home Assistant 2026.6+ rendszerekhez.

## Funkciók

- több Yardian vezérlő és dinamikusan bővíthető zónalista;
- két választható ütemezés: pontos **Fix időpont** vagy automatikusan tervezett
  **Vízigény-alapú időablak**, soros végrehajtással;
- egységes, kizárólag Időkép-alapú napi előrejelzés;
- a Smart Yardian beállításaiból módosítható Időkép-előrejelzési település;
- település alapján kiválasztható közeli Időkép automata; a mért csapadék a
  tartós vízmérlegbe, az előrejelzett eső a halasztási döntésbe kerül;
- átlátható, 0–150%-os időjárási korrekció;
- Hargreaves–Samani napi ET0-becslés az Időkép hőmérsékleteiből, a HA
  helyadataiból, naposság/felhőzet-, szél- és páratartalom-korrekcióval;
- zónánként választható manuális vagy szórófej-referencia alapján számolt idő;
- programonként opcionális hőmérséklet-feltétel a program naptári napjának
  előrejelzett maximumára;
- külön háromnapos előnézet a várható futásokkal, halasztásokkal, a
  többnapos vízmérleggel és zónánként számolt időkkel;
- külön órás Időkép-előrejelzés hőmérséklettel, csapadékmennyiséggel és
  csapadékeséllyel;
- rotátor, MP800, spray, rotoros és csepegtető zónaprofil, opcionális
  vízhozam- és területméréssel;
- napos vagy árnyékos területjelleg, amely referencia módban módosítja az időt;
- Home Assistant/Zigbee talajnedvességmérő hozzárendelése egy, több vagy minden
  zónához, programonként kapcsolható időtartam-korrekcióval és zónakihagyással;
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

## Fix időpont és vízigény-alapú időablak

A programszerkesztőben programonként választható az indítás módja:

- **Fix időpont:** a program a kiválasztott napokon pontosan a megadott
  kezdési időben indul. A működése változatlan és továbbra is bármikor
  választható; a frissítés előtt mentett programok automatikusan ebben a módban
  maradnak.
- **Vízigény-alapú időablak:** megadható, hogy mely napokon és mettől meddig
  öntözhet a rendszer. A kijelölt napok engedélyezett öntözési lehetőségek,
  nem kötelező napi futások: a Smart Yardian csak akkor tervez öntözést, ha a
  felhalmozott vízhiány ezt indokolja.

Az okos tervező 15 perces lépésekben a szárazabb és kisebb szelű időpontokat
keresi. Szórófejes gyepnél ezután a teljes program napszakát értékeli: a
**04:00–08:00** közötti hajnali sáv az elsődleges, a **02:00–10:00** közötti
időszak elfogadható tartalék. A déli órák a nagyobb párolgás és szél, a késő
délutáni/esti órák pedig az elhúzódó levélnedvesség miatt kerülnek hátrébb.
Ez rangsorolás, nem tiltás: ha a felhasználó csak más napszakot engedélyez, a
legjobb beférő tartalék időpont továbbra is lefut. Csepegtetőnél nincs
lombnedvességi napszakbüntetés; ott a száraz, kisebb párolgási veszteségű
időpont nyer.

Hiányzó szél- vagy páratartalom-adat nem tiltja le a programot; a hiányzó
széladatú időpont hátrébb kerül. Túl erős szélben overhead zóna nem indul; a
csepegtetőt a szél nem blokkolja. Az időpontválasztás indoklásában a panel
kiírja, hogy ajánlott hajnali vagy korlátozott időablak miatti tartalék sávot
választott-e.

A hajnali alapérték több, egymástól független gyepfenntartási ajánlás közös
része: a [University of California IPM](https://ipm.ucanr.edu/TOOLS/TURF/MAINTAIN/irrwhen.html)
02:00–08:00, az [Iowa State University](https://yardandgarden.extension.iastate.edu/faq/when-best-time-water-lawn)
05:00–09:00 közötti öntözést javasol, a
[UF/IFAS növénykórtani útmutatója](https://ask.ifas.ufl.edu/publication/LH040)
pedig a már meglévő hajnali harmat idejét emeli ki. A Smart Yardian
04:00–08:00 elsődleges sávja ezekből képzett konzervatív mérnöki alapérték,
nem egyetlen, percre pontos biológiai határ.

Az időablak kemény határ: a rendszer a Yardian start/stop visszaigazolásainak
idejére is tartalékot hagy. Ha a teljes célmennyiség nem fér be, 0,5 mm-es
lépésekben kisebb, de minden zónát tartalmazó futást keres; a fennmaradó
vízhiány megmarad a következő engedélyezett alkalomra. Ha még 0,5 mm sem fér
el, nem indít részleges zónasort. Az ablak átnyúlhat éjfélen; a kiválasztott
hétköznap az ablak nyitási napját jelenti.

A kézi **Futtatás most** és a **Kézi program** nem vár az időablakra. Új heti
program alapból okos, 02:00–07:00 közötti ablakkal készül, de egy kattintással
átállítható fix időpontra.

### Tartós többnapos vízmérleg

Minden vízigény-alapú program saját, Home Assistant-újraindítást túlélő
vízmérleget vezet. Naponta hozzáadja a gyep `ETc`-igényét, amelyet a
hőmérséklet, felhőzet/naposság, szél és páratartalom alapján számol, majd
levonja a kiválasztott Időkép automata újonnan mért csapadékát. Az elmúlt
24 órás gördülő mérés változását tárolja, ezért ugyanazt az esőt nem számolja
el minden frissítéskor újra.

Alapból 5 mm felhalmozott vízhiánynál tervez futást, egy alkalommal legfeljebb
10 mm-t juttat ki, és legfeljebb 15 mm esőkreditet visz tovább. A következő
36 óra előrejelzett esője halasztást okozhat. Két kihagyott engedélyezett ablak
után a kisebb maradék hiányt is pótolja, kivéve, ha a közelgő eső várhatóan a
teljes hiányt lefedi. Ezek a határértékek a **Beállítások →
Vízigény-alapú tervezés** részben módosíthatók. Az előrejelzett eső nem kerül
levonásra a tartós vízmérlegből: csak a halasztási döntést befolyásolja, így nem
számoljuk kétszer ugyanazt a csapadékot.

A rendszer a befejezett zónák, valamint a leállításig vagy körkihagyásig
ténylegesen eltelt öntözési idő becsült kijuttatását vonja le. A talajnedvesség
miatt rövidített vagy kihagyott igényt a nedves talaj által már fedezett
mennyiségként kezeli, ezért ez nem terhelődik át a szenzor nélküli zónákra. A
kiválasztott optimális időpontot induláskor az aktuális előrejelzéssel
újraértékeli; újraindítás után sem veszik el a vízmérleg vagy a halasztás, és
nem keletkezik duplikált futás.

Egy zóna egyszerre csak egy engedélyezett vízigény-alapú programhoz tartozhat,
mert különben ugyanazt a területet két önálló vízmérleg számolná. Fix időpontú
program továbbra is használhatja ugyanazt a zónát kézi, felhasználói
felülbírálásként. Legfeljebb hét napos Home Assistant-kiesésnél a rendszer a
legutóbbi ismert napi nettó igénnyel óvatosan visszatölti a hiányzó napokat;
hosszabb bizonytalanságnál az aktuális nap adataival biztonságosan
újraalapozza a mérleget, értesítést küld, majd tovább működik.

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
használata. Az alapgörbe 30% alatt legfeljebb 120%-ra növeli az időt, 55%-nál
100%-ot használ, 55–80% között lineárisan rövidít, 80%-tól pedig kihagyja a
zónát. A négy érték a Beállításokban módosítható. Hiányzó, nem százalékos vagy
érvénytelen szenzoradat nem blokkolja a zónát, hanem korrekció nélkül hagyja.
Azok a zónák, amelyekhez nincs talajnedvességmérő rendelve, szintén változatlan,
ET- és időjárás-alapú időtartammal futnak tovább.

Alapbeállításként a napi referencia-párolgás 5 mm, a gyep növényi együtthatója
(`Kc`) 0,85. A referencia mód célja: `korrigált ET0 × Kc × területjelleg ×
esőszorzó`. A manuális perces mód ugyanezt az ET0-t az 5 mm-es
referenciaértékhez viszonyított időjárási szorzóként használja. A régi
hőmérsékleti céltábla kikapcsolt ET-számításnál kompatibilitási tartalék marad.

Az ET0 Hargreaves–Samani-becslésből készül a napi minimum, maximum és
átlaghőmérséklettel. Az elméleti napsugárzást a dátum és a Home Assistantban
beállított földrajzi szélesség adja; a végeredményt az Időkép felhőzet/naposság,
szél és páratartalom adatai korrigálják. Az ebből számolt `ETc` naponta kerül a
többnapos vízmérlegbe, az engedélyezett öntözési napoktól függetlenül.

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
és a teljes futási időt. Vízigény-alapú programnál látszik a futás előtti
vízmérleg, a napi `ETc`-igény, az elszámolt mért és a közelgő előrejelzett eső,
a tervezett kijuttatási mélység, a maradó vízhiány, valamint a **Még nem
szükséges** és **Esőre vár** állapot. Az előnézet figyelembe veszi az
automatika állapotát, a szüneteltetést, a `skip next` jelölést és a
hőmérséklet-feltételt. A számítás csak előnézet, nem indít Yardian zónát.

Egy naptári nap minden programja közös napi időjárási döntést használ. Fix
programnál ez a beállított indulás napja; éjfélen átnyúló okos időablaknál a
végül kiválasztott kezdés naptári napja. A számítás kizárólag ehhez a helyi
naptári naphoz tartozó Időkép-órákat veszi figyelembe. Ha a naphoz egyetlen
használható órás rekord sincs, az időjárásfüggő program biztonsági okból nem
indul el.

Távolabbi napnál csak akkor jelenik meg konkrét futási idő, ha az Időkép
ad használható órás előrejelzést az adott naptári naphoz.

## Lehullott csapadék Időkép automatából

A **Beállítások → Lehullott csapadék · Időkép automata** részen add meg a
település nevét, keresd meg a környékbeli automatákat, válaszd ki a megfelelőt,
majd mentsd a beállításokat. A Smart Yardian az Időkép nyilvános
[24 órás csapadéktérképéből](https://www.idokep.hu/csapadek) olvassa ki az
automata mért értékét, legfeljebb óránként egyszer.

A panel külön mutatja az elmúlt 24 órában mért és a még várható csapadékot.
Vízigény-alapú programnál az újonnan mért mennyiség a tartós vízmérleget
csökkenti; a rendszer eltárolja a gördülő mérés állapotát, ezért nem számolja
el ugyanazt a csapadékot több napon át. Az előrejelzett eső kizárólag a
legfeljebb 36 órás halasztási döntéshez kell, és csak a tényleges mérés után
kerülhet a vízmérlegbe. A radaros becslés ellenőrzésként látható, de a számítás
a kiválasztott automata mérését használja. Ez közeli állomásadat, ezért nem
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
