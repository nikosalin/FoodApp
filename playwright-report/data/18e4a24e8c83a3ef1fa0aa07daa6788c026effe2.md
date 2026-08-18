# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\menu.spec.ts >> menu page loads
- Location: tests\smoke\menu.spec.ts:16:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Unsere Speisekarte|Our Menu/i })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: /Unsere Speisekarte|Our Menu/i }) resolved to 2 elements:
    1) <h1 class="relative mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Unsere Speisekarte</h1> aka getByRole('heading', { name: 'Unsere Speisekarte', exact: true })
    2) <h3 class="text-lg font-bold tracking-wide text-pita">Werfen Sie einen Blick auf unsere Speisekarte.</h3> aka getByRole('heading', { name: 'Werfen Sie einen Blick auf' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /Unsere Speisekarte|Our Menu/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e4]:
      - link "Saloniki Grill" [ref=e5] [cursor=pointer]:
        - /url: /
      - navigation [ref=e7]:
        - paragraph [ref=e8]: Το φαγητό θέλει μεράκι
      - generic [ref=e9]:
        - generic [ref=e10]:
          - button "English" [ref=e11]:
            - img "English" [ref=e12]
          - button "Deutsch" [ref=e13]:
            - img "Deutsch" [ref=e14]
        - link "View cart" [ref=e15] [cursor=pointer]:
          - /url: /cart
    - generic [ref=e19]:
      - generic [ref=e20]:
        - paragraph [ref=e22]: Fresh from the grill
        - heading "Unsere Speisekarte" [level=1] [ref=e23]
      - navigation "Menu categories" [ref=e25]:
        - generic [ref=e27]:
          - button "AM HÄUFIGSTEN BESTELLT" [ref=e28]
          - button "SALATE" [ref=e29]
          - button "GYROS & PITA" [ref=e30]
          - button "VOM GRILL" [ref=e31]
          - button "BEILAGEN" [ref=e32]
          - button "SAUCEN" [ref=e33]
          - button "ALKOHOLFREIE GETRÄNKE" [ref=e34]
          - button "BIER & WEIN (18+)" [ref=e35]
      - generic [ref=e36]:
        - generic [ref=e37]:
          - heading "AM HÄUFIGSTEN BESTELLT" [level=3] [ref=e38]
          - generic [ref=e39]:
            - article [ref=e41] [cursor=pointer]:
              - generic [ref=e42]:
                - heading "Gyros-Teller" [level=4] [ref=e44]
                - paragraph [ref=e45]: Gyros, Tzatziki, Pommes, Zwiebeln, Oregano, Ketchup, Mayonnaise und Senf.
                - generic [ref=e46]: € 16.50
              - button "Anpassen Gyros-Teller" [ref=e47]
            - article [ref=e49] [cursor=pointer]:
              - generic [ref=e50]:
                - heading "Gyros Pita Saloniki" [level=4] [ref=e52]
                - paragraph [ref=e53]: Krautsalat, Tzatziki und Zwiebeln.
                - generic [ref=e54]: € 8.50
              - button "Anpassen Gyros Pita Saloniki" [ref=e55]
        - generic [ref=e56]:
          - heading "SALATE" [level=3] [ref=e57]
          - generic [ref=e58]:
            - article [ref=e60] [cursor=pointer]:
              - generic [ref=e61]:
                - heading "Feta" [level=4] [ref=e63]
                - paragraph [ref=e64]: Feta, Olivenöl und Oregano.
                - generic [ref=e65]: € 3.00
              - button "Anpassen Feta" [ref=e66]
            - article [ref=e68] [cursor=pointer]:
              - generic [ref=e69]:
                - heading "Portion Tzatziki" [level=4] [ref=e71]
                - paragraph [ref=e72]: Joghurt, Gurke und Knoblauch.
                - generic [ref=e73]: € 5.00
              - button "Anpassen Portion Tzatziki" [ref=e74]
            - article [ref=e76] [cursor=pointer]:
              - generic [ref=e77]:
                - heading "Weißkrautsalat" [level=4] [ref=e79]
                - paragraph [ref=e80]: Weißkohl, Essig, Öl und Gewürze.
                - generic [ref=e81]: € 5.00
              - button "Anpassen Weißkrautsalat" [ref=e82]
            - article [ref=e84] [cursor=pointer]:
              - generic [ref=e85]:
                - heading "Gemischter Salat" [level=4] [ref=e87]
                - paragraph [ref=e88]: Blattsalat, Tomaten, Gurken, Zwiebeln und Mais.
                - generic [ref=e89]: € 5.00
              - button "Anpassen Gemischter Salat" [ref=e90]
            - article [ref=e92] [cursor=pointer]:
              - generic [ref=e93]:
                - heading "Bauernsalat" [level=4] [ref=e95]
                - paragraph [ref=e96]: Tomaten, Gurken, Zwiebeln, Feta und Oliven.
                - generic [ref=e97]: € 7.00
              - button "Anpassen Bauernsalat" [ref=e98]
            - article [ref=e100] [cursor=pointer]:
              - generic [ref=e101]:
                - heading "Peperoni" [level=4] [ref=e103]
                - paragraph [ref=e104]: Peperoni, Olivenöl und Knoblauch.
                - generic [ref=e105]: € 6.50
              - button "Anpassen Peperoni" [ref=e106]
            - article [ref=e108] [cursor=pointer]:
              - generic [ref=e109]:
                - heading "Oliven" [level=4] [ref=e111]
                - paragraph [ref=e112]: Oliven, Olivenöl und Kräuter.
                - generic [ref=e113]: € 6.50
              - button "Anpassen Oliven" [ref=e114]
        - generic [ref=e115]:
          - heading "GYROS & PITA" [level=3] [ref=e116]
          - generic [ref=e117]:
            - article [ref=e119] [cursor=pointer]:
              - generic [ref=e120]:
                - heading "Gyros-Teller" [level=4] [ref=e122]
                - paragraph [ref=e123]: Gyros, Tzatziki, Pommes, Zwiebeln, Oregano, Ketchup, Mayonnaise und Senf.
                - generic [ref=e124]: € 16.50
              - button "Anpassen Gyros-Teller" [ref=e125]
            - article [ref=e127] [cursor=pointer]:
              - generic [ref=e128]:
                - heading "Vegetarische Pita" [level=4] [ref=e130]
                - paragraph [ref=e131]: Warmes Pitabrot mit frischem Salat.
                - generic [ref=e132]: € 7.00
              - button "Anpassen Vegetarische Pita" [ref=e133]
            - article [ref=e135] [cursor=pointer]:
              - generic [ref=e136]:
                - heading "Gyros Pita Saloniki" [level=4] [ref=e138]
                - paragraph [ref=e139]: Krautsalat, Tzatziki und Zwiebeln.
                - generic [ref=e140]: € 8.50
              - button "Anpassen Gyros Pita Saloniki" [ref=e141]
            - article [ref=e143] [cursor=pointer]:
              - generic [ref=e144]:
                - heading "Gyros Pita mit Salat" [level=4] [ref=e146]
                - paragraph [ref=e147]: Klassische Gyros-Pita mit frischem Salat.
                - generic [ref=e148]: € 9.50
              - button "Anpassen Gyros Pita mit Salat" [ref=e149]
            - article [ref=e151] [cursor=pointer]:
              - generic [ref=e152]:
                - heading "Gyros Pita Spezial nach griechischer Art" [level=4] [ref=e154]
                - paragraph [ref=e155]: Unsere besondere Hausspezialität.
                - generic [ref=e156]: € 10.00
              - button "Anpassen Gyros Pita Spezial nach griechischer Art" [ref=e157]
            - article [ref=e159] [cursor=pointer]:
              - generic [ref=e160]:
                - heading "Gyros pur" [level=4] [ref=e162]
                - paragraph [ref=e163]: Gyros, Zwiebeln und Oregano.
                - generic [ref=e164]: € 11.00
              - button "Anpassen Gyros pur" [ref=e165]
            - article [ref=e167] [cursor=pointer]:
              - generic [ref=e168]:
                - heading "Pita mit Pommes & Tzatziki" [level=4] [ref=e170]
                - paragraph [ref=e171]: Pitabrot, Pommes, Tzatziki, Ketchup, Mayonnaise und Senf.
                - generic [ref=e172]: € 6.50
              - button "Anpassen Pita mit Pommes & Tzatziki" [ref=e173]
            - article [ref=e175] [cursor=pointer]:
              - generic [ref=e176]:
                - heading "Gyros Box" [level=4] [ref=e178]
                - paragraph [ref=e179]: Gyros, Pommes, Zwiebeln, Oregano, Ketchup, Mayonnaise und Senf.
                - generic [ref=e180]: € 7.50
              - button "Anpassen Gyros Box" [ref=e181]
            - article [ref=e183] [cursor=pointer]:
              - generic [ref=e184]:
                - heading "Gyros Metaxa" [level=4] [ref=e186]
                - paragraph [ref=e187]: Gyros, Feta, Zwiebeln, Oregano, Salat, Pommes, Ketchup, Mayonnaise und Senf.
                - generic [ref=e188]: € 16.00
              - button "Anpassen Gyros Metaxa" [ref=e189]
            - article [ref=e191] [cursor=pointer]:
              - generic [ref=e192]:
                - heading "Gyros Metaxa mit Reisnudeln" [level=4] [ref=e194]
                - paragraph [ref=e195]: Gyros, Reisnudeln, Feta, Zwiebeln und Oregano.
                - generic [ref=e196]: € 16.00
              - button "Anpassen Gyros Metaxa mit Reisnudeln" [ref=e197]
        - generic [ref=e198]:
          - heading "VOM GRILL" [level=3] [ref=e199]
          - generic [ref=e200]:
            - article [ref=e202] [cursor=pointer]:
              - generic [ref=e203]:
                - heading "Bifteki" [level=4] [ref=e205]
                - paragraph [ref=e206]: Gegrilltes Hacksteak mit Käsefüllung.
                - generic [ref=e207]: € 18.00
              - button "Anpassen Bifteki" [ref=e208]
            - article [ref=e210] [cursor=pointer]:
              - generic [ref=e211]:
                - heading "Schweine-Souvlaki" [level=4] [ref=e213]
                - paragraph [ref=e214]: Zwei Fleischspieße vom Holzkohlegrill.
                - generic [ref=e215]: € 17.00
              - button "Anpassen Schweine-Souvlaki" [ref=e216]
            - article [ref=e218] [cursor=pointer]:
              - generic [ref=e219]:
                - heading "Soutzoukakia" [level=4] [ref=e221]
                - paragraph [ref=e222]: Zwei würzige Hackfleischröllchen.
                - generic [ref=e223]: € 16.00
              - button "Anpassen Soutzoukakia" [ref=e224]
            - article [ref=e226] [cursor=pointer]:
              - generic [ref=e227]:
                - heading "Grillteller" [level=4] [ref=e229]
                - paragraph [ref=e230]: Gyros, Souvlaki-Spieß, Soutzoukaki, Zwiebeln und Oregano.
                - generic [ref=e231]: € 18.00
              - button "Anpassen Grillteller" [ref=e232]
        - generic [ref=e233]:
          - heading "BEILAGEN" [level=3] [ref=e234]
          - generic [ref=e235]:
            - article [ref=e237] [cursor=pointer]:
              - generic [ref=e238]:
                - heading "Pommes" [level=4] [ref=e240]
                - paragraph [ref=e241]: Pommes, Ketchup, Mayonnaise und Senf.
                - generic [ref=e242]: € 4.00
              - button "Anpassen Pommes" [ref=e243]
            - article [ref=e245] [cursor=pointer]:
              - generic [ref=e246]:
                - heading "Bratwurst" [level=4] [ref=e248]
                - paragraph [ref=e249]: Frisch gegrillte Bratwurst.
                - generic [ref=e250]: € 3.50
              - button "Anpassen Bratwurst" [ref=e251]
            - article [ref=e253] [cursor=pointer]:
              - generic [ref=e254]:
                - heading "Currywurst" [level=4] [ref=e256]
                - paragraph [ref=e257]: Geschnittene Bratwurst mit Curryketchup.
                - generic [ref=e258]: € 4.50
              - button "Anpassen Currywurst" [ref=e259]
            - article [ref=e261] [cursor=pointer]:
              - generic [ref=e262]:
                - heading "Currywurst mit Pommes" [level=4] [ref=e264]
                - paragraph [ref=e265]: Currywurst, Pommes, Ketchup, Mayonnaise und Senf.
                - generic [ref=e266]: € 8.00
              - button "Anpassen Currywurst mit Pommes" [ref=e267]
            - article [ref=e269] [cursor=pointer]:
              - generic [ref=e270]:
                - heading "Pitabrot" [level=4] [ref=e272]
                - paragraph [ref=e273]: Mit Olivenöl und Oregano.
                - generic [ref=e274]: € 2.50
              - button "Anpassen Pitabrot" [ref=e275]
            - article [ref=e277] [cursor=pointer]:
              - generic [ref=e278]:
                - heading "Reisnudeln" [level=4] [ref=e280]
                - paragraph [ref=e281]: Eine Portion Reisnudeln als Beilage.
                - generic [ref=e282]: € 5.00
              - button "Anpassen Reisnudeln" [ref=e283]
        - generic [ref=e284]:
          - heading "SAUCEN" [level=3] [ref=e285]
          - generic [ref=e286]:
            - article [ref=e288] [cursor=pointer]:
              - generic [ref=e289]:
                - heading "Ketchup" [level=4] [ref=e291]
                - paragraph [ref=e292]: Klassischer Tomatenketchup.
                - generic [ref=e293]: € 1.00
              - button "Anpassen Ketchup" [ref=e294]
            - article [ref=e296] [cursor=pointer]:
              - generic [ref=e297]:
                - heading "Mayonnaise" [level=4] [ref=e299]
                - paragraph [ref=e300]: Mild und cremig.
                - generic [ref=e301]: € 1.00
              - button "Anpassen Mayonnaise" [ref=e302]
            - article [ref=e304] [cursor=pointer]:
              - generic [ref=e305]:
                - heading "Salatmayonnaise" [level=4] [ref=e307]
                - paragraph [ref=e308]: Leichte Mayonnaise mit feiner Würze.
                - generic [ref=e309]: € 1.00
              - button "Anpassen Salatmayonnaise" [ref=e310]
            - article [ref=e312] [cursor=pointer]:
              - generic [ref=e313]:
                - heading "Tzatziki" [level=4] [ref=e315]
                - paragraph [ref=e316]: Joghurt mit Gurke und Knoblauch.
                - generic [ref=e317]: € 2.50
              - button "Anpassen Tzatziki" [ref=e318]
            - article [ref=e320] [cursor=pointer]:
              - generic [ref=e321]:
                - heading "Curryketchup" [level=4] [ref=e323]
                - paragraph [ref=e324]: Ketchup mit feiner Currynote.
                - generic [ref=e325]: € 1.00
              - button "Anpassen Curryketchup" [ref=e326]
            - article [ref=e328] [cursor=pointer]:
              - generic [ref=e329]:
                - heading "Senf" [level=4] [ref=e331]
                - paragraph [ref=e332]: Klassischer Senf.
                - generic [ref=e333]: € 1.00
              - button "Anpassen Senf" [ref=e334]
        - generic [ref=e335]:
          - heading "ALKOHOLFREIE GETRÄNKE" [level=3] [ref=e336]
          - generic [ref=e337]:
            - article [ref=e339] [cursor=pointer]:
              - generic [ref=e340]:
                - heading "Mineralwasser Still, 0,5 l" [level=4] [ref=e342]
                - paragraph [ref=e343]: Natürliches stilles Mineralwasser.
                - generic [ref=e344]: € 2.85
              - button "Anpassen Mineralwasser Still, 0,5 l" [ref=e345]
            - article [ref=e347] [cursor=pointer]:
              - generic [ref=e348]:
                - heading "Coca-Cola, 1 l" [level=4] [ref=e350]
                - paragraph [ref=e351]: Enthält Koffein.
                - generic [ref=e352]: € 4.85
              - button "Anpassen Coca-Cola, 1 l" [ref=e353]
            - article [ref=e355] [cursor=pointer]:
              - generic [ref=e356]:
                - heading "Coca-Cola, 0,33 l" [level=4] [ref=e358]
                - paragraph [ref=e359]: Enthält Koffein.
                - generic [ref=e360]: € 3.25
              - button "Anpassen Coca-Cola, 0,33 l" [ref=e361]
            - article [ref=e363] [cursor=pointer]:
              - generic [ref=e364]:
                - heading "Fanta, 1 l" [level=4] [ref=e366]
                - paragraph [ref=e367]: Orangenlimonade.
                - generic [ref=e368]: € 4.85
              - button "Anpassen Fanta, 1 l" [ref=e369]
            - article [ref=e371] [cursor=pointer]:
              - generic [ref=e372]:
                - heading "Sprite, 0,33 l" [level=4] [ref=e374]
                - paragraph [ref=e375]: Zitronen-Limetten-Erfrischungsgetränk.
                - generic [ref=e376]: € 3.25
              - button "Anpassen Sprite, 0,33 l" [ref=e377]
        - generic [ref=e378]:
          - heading "BIER & WEIN (18+)" [level=3] [ref=e379]
          - generic [ref=e380]:
            - article [ref=e382] [cursor=pointer]:
              - generic [ref=e383]:
                - heading "Kölsch, 0,33 l" [level=4] [ref=e385]
                - paragraph [ref=e386]: Leichtes obergäriges Bier aus Köln.
                - generic [ref=e387]: € 3.42
              - button "Anpassen Kölsch, 0,33 l" [ref=e388]
            - article [ref=e390] [cursor=pointer]:
              - generic [ref=e391]:
                - heading "Mythos, 0,33 l" [level=4] [ref=e393]
                - paragraph [ref=e394]: Griechisches Lagerbier.
                - generic [ref=e395]: € 3.92
              - button "Anpassen Mythos, 0,33 l" [ref=e396]
            - article [ref=e398] [cursor=pointer]:
              - generic [ref=e399]:
                - heading "Retsina, 0,5 l" [level=4] [ref=e401]
                - paragraph [ref=e402]: Traditioneller griechischer Weißwein mit feiner Harznote.
                - generic [ref=e403]: € 8.00
              - button "Anpassen Retsina, 0,5 l" [ref=e404]
            - article [ref=e406] [cursor=pointer]:
              - generic [ref=e407]:
                - heading "Ouzo, 0,05 l" [level=4] [ref=e409]
                - paragraph [ref=e410]: Traditioneller griechischer Anisschnaps.
                - generic [ref=e411]: € 3.50
              - button "Anpassen Ouzo, 0,05 l" [ref=e412]
    - generic [ref=e413]:
      - heading "Werfen Sie einen Blick auf unsere Speisekarte." [level=3] [ref=e414]
      - link "MENU" [ref=e415] [cursor=pointer]:
        - /url: /menu
      - paragraph [ref=e416]: © 2026 OPA. All rights reserved.
  - button "Open Next.js Dev Tools" [ref=e422] [cursor=pointer]
  - alert [ref=e426]
```

# Test source

```ts
  1  | // import { expect, test } from "@playwright/test";
  2  | 
  3  | // test("menu page loads", async ({ page }) => {
  4  | //   await page.goto("/menu");
  5  | //   await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
  6  | //   await expect(
  7  | //     page.getByRole("button", { name: "MOST POPULAR" }),
  8  | //   ).toBeVisible();
  9  | //   await expect(
  10 | //     page.getByRole("button", { name: /Customize Fries/i }).first(),
  11 | //   ).toBeVisible();
  12 | // });
  13 | 
  14 | import { expect, test } from "@playwright/test";
  15 | 
  16 | test("menu page loads", async ({ page }) => {
  17 |   await page.goto("/menu");
  18 |   await expect(
  19 |     page.getByRole("heading", { name: /Unsere Speisekarte|Our Menu/i }),
> 20 |   ).toBeVisible();
     |     ^ Error: expect(locator).toBeVisible() failed
  21 |   await expect(
  22 |     page.getByRole("button", { name: /AM HÄUFIGSTEN BESTELLT|MOST POPULAR/i }),
  23 |   ).toBeVisible();
  24 | });
  25 | 
```