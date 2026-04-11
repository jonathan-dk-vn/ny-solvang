# FARINGS MANAGER BI — Teknisk Systemforklaring

**Enterprise Edition | DanBred/SEGES 2024-standard**

---

Dette er et **BI-system (Business Intelligence) til styring af faringer på sohold** bygget efter DanBred/SEGES 2024-standarden — en af de mest avancerede standarder inden for dansk svineproduktion. Nedenfor følger en detaljeret forklaring af samtlige funktioner set fra et landbrugsteknisk perspektiv.

---

## 🏗️ BLOCK 1 — KPI-konfiguration og Zootekniske parametre

Dette er systemets "hjerne" og standardgrundlag. Alle evalueringsgrænser er samlet ét sted.

**Produktions-KPI'er (SEGES/DanBred 2024):**

| Parameter                 | Værdi     | Betydning                                                                               |
| ------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `FARINGER_UGE`            | 80        | Målsætning for antal faringer pr. uge — bruges til evaluering af reproduktionskapacitet |
| `LEVENDE_PR_KULD`         | 20,0      | Levende grise pr. kuld (hele besætningen) — DanBreds kerneindikator                     |
| `LEVENDE_GYLTE_PR_KULD`   | 18,0      | Levende grise pr. kuld for **gylte** (1. læg) — lavere end for ældre søer               |
| `DODFODTE_PR_KULD`        | 1,6       | Dødfødte pr. kuld — tilladt maksimum                                                    |
| `STILLBIRTH_RATE_ALERT`   | 12,0 %    | Advarselsgrænse for dødfødselsraten                                                     |
| `DODFODTE_GAML_SO`        | ≥ 3       | Grænse for dødfødte til vurdering af **udsætning af gamle søer**                        |
| `UDSAETNING_KULD`         | ≥ 6. kuld | Minimumsparitet for udsætningsvurdering                                                 |
| `TOP_SO_LEVENDE`          | ≥ 22      | Grænse for "Stjerneso" — ugens bedste so                                                |
| `PRE_WEAN_MORTALITY_PCT`  | 9,0 %     | Maksimalt tilladt pattegrisedødelighed før fravænning                                   |
| `MUMIFIED_ALERT_PER_KULD` | 0,5       | Mumificerede fostre pr. kuld — advarsel om potentiel smitsom sygdom                     |

**Zootekniske parametre (reproduktionsfysiologi):**

| Parameter               | Værdi          | Betydning                                                                   |
| ----------------------- | -------------- | --------------------------------------------------------------------------- |
| `GESTATION_DAYS`        | 115–117 dage   | Normal drægtighedsperiode for søer                                          |
| `PRIS_PER_PATTEGRIS`    | 200 DKK        | Økonomisk værdi pr. levende pattegris ved fødsel (bruges til tabsberegning) |
| `BIMOXYL_WEEKLY_ALERT`  | ≥ 15 doser/uge | Grænse for "Gult Kort" — advarsel om overforbrug af antibiotika             |
| `MMA_INTERVENTION_RATE` | > 20 %         | Alarmgrænse for MMA-rate på besætningsniveau pr. uge                        |

---

## 📥 BLOCK 2 — Indlæsning og normalisering af Excel-data

Funktionen `readExcelData()` læser filer eksporteret fra besætningsstyringsprogrammer (f.eks. AgroSoft, PigVision) med følgende obligatoriske kolonner:

- **`Sonavn`** — Soens ID/navn
- **`Oprettet den`** — Dato og tidspunkt for faring
- **`Kuld`** — Kuldnummer (paritet)
- **`Levendefødte`** — Antal levende grise
- **`Dødfødte`** — Antal dødfødte grise

Valgfrie kolonner som `Indgreb` (manuel indgriben ved faring), `Feber` (feber post partum), `Mumificerede` (mumificerede fostre) og `Faringstid` (faringsvarighed) aktiverer avancerede analyser.

Funktionen `processAndGroupData()` håndterer **ISO-ugenumre** — vigtigt fordi den danske landbrugskalender anvender ISO-uger og ikke kalenderuger. Data grupperes i strukturen `År → Uge → [Liste over faringer]`.

---

## 🐷 BLOCK 3 — Zooteknisk logik og individvurdering

### 1. Paritetsgruppering (`getParityGroup`)

Kuldnummeret inddeles i 4 grupper efter dansk standard:

- **Gylte (Kuld 1)** — Første faring hos ungso: kræver egne benchmarks, lavere end ældre søer
- **2. Lægs** — 2. kuld: ofte svagere pga. "second litter syndrome"
- **Prime (Kuld 3–5)** — Biologisk ydelsestop
- **Gamle søer (Kuld 6+)** — Overvåges med henblik på udsætning

### 2. Vagtinddeling (`getShift`)

- **Dagvagt (06:00–16:00)** — Dag-vagt
- **Natvagt (16:00–06:00)** — Nat-vagt

Disse data bruges til **analyse af faringsudbytte pr. vagt** — til identifikation af vagter med høj indgrebsfrekvens og forhøjet dødfødselsrate, samt til personaleplanlægning.

### 3. Individvurdering af so (`getSowComment`)

Dette er systemets mest avancerede algoritme, baseret på **DanBreds 2024-benchmark fordelt efter paritet**:

```
So i 4. kuld (Prime-top):
  Elite ≥ 22,5 levende + SB < 6%  →  💎 Eliteso — avlskandidat
  Top   ≥ 20,5                      →  🏆 Topydelse
  God   ≥ 18                        →  ✅ God ydelse
  ...
```

Systemet beregner **2 separate pointscores**, der kombineres med vægtning:

- **Kuldstørrelsesscore** (antal levende grise): vægt **65 %**
- **Dødfødselscore** (dødfødselsrate): vægt **35 %**

Dette afspejler DanBreds filosofi: prioriter levende grise, men straf hårdt ved høj dødfødselsrate.

Kritisk override: hvis `SB% > 25 %` eller `dødfødte ≥ 7 grise` → automatisk etiket **"🚨 Faringskrise — akut indgriben"**.

### 4. Medicinprotokol (`getMedicinePatFar`)

- **Pattegrise fra 1. kuld (gylte)**: `Bimoxyl LA 0,3 ml + Neuton 0,3 ml` (antibiotika + jern/nervesupplement)
- **Pattegrise fra øvrige kuld**: `Bimoxyl LA 0,3 ml` (profylaktisk antibiotika)
- **De 2 første grise i kuldet behandles ikke** (logik `index < 2`) — undgå spild
- **So efter faring**: `Oxytobel 2 ml + Melovem 5 ml` (Oxytocin til livmoderkontraktioner + NSAID betændelsesdæmpende)

### 5. MMA-risikovurdering (`assessMMARisk`)

MMA (Mastitis-Metritis-Agalactia) er et komplekst syndrom med yverbetændelse, livmoderbetændelse og agalakti, der forårsager tab på 500–800 DKK pr. so. Systemet scorer risiko ud fra 5 faktorer:

| Risikofaktor         | Point | Faglig begrundelse                                    |
| -------------------- | ----- | ----------------------------------------------------- |
| Paritet ≥ 5          | +2    | Aldret livmoder med nedsat kontraktionsevne           |
| Totalkuld > 17 grise | +2    | Langvarig faring → øget risiko for genitalinfektioner |
| Indgreb ved faring   | +3    | Mekanisk livmoderskade                                |
| Feber post partum    | +4    | Stærkeste kliniske tegn på infektion                  |
| Dødfødte > 3 grise   | +1    | Indirekte indikator for lang faringsvarighed          |

Samlet score: `≥ 6 = Høj risiko 🔴`, `3–5 = Middel 🟡`, `< 3 = Lav 🟢`

### 6. Antibiotikaadvarsel — "Gult Kort" (`assessAntibioticAlert`)

Ifølge dansk lovgivning (BEK nr. 325 af 23/03/2021) udløses en `🟡 GULT KORT`-advarsel, hvis det ugentlige forbrug af Bimoxyl-doser overstiger 15. Systemet anmoder om kontakt til den ansvarlige dyrlæge for gennemgang af behandlingsprotokollen.

---

## 📊 BLOCK 4 — Rapportgenerering og visualisering

### Automatisk SVG-søjlediagram (`generateSvgBarChart`)

Scriptet genererer SVG-diagrammer direkte (indlejret i Markdown) med:

- **Lineær regressionstrendlinje (OLS)** — farvekodet orange/grøn/rød afhængigt af om tendensen er positiv eller negativ
- **KPI-mållinje** (blå)
- **Gennemsnitslinje** (grå)
- **"Krævet Gennemsnit"-linje** (lilla/rød) — _særlig indikator_: beregner baglæns, hvilket gennemsnit de resterende uger skal præstere for at nå årets mål
- Intelligent søjlefarve: 🟢 God / 🟡 Middel / 🔴 Dårlig

### Ugentlig ledelsesresumé (`buildExecutiveSummary`)

Målrettet gårdejer og ledelse med:

- Sammenligning af ugens KPI'er med målsætninger
- **Beregning af økonomisk tab i DKK**: `(KPI_levende - faktisk_levende) × antal faringer × 200 DKK`
- Antibiotika- og MMA-advarsler

### Personaleheatmap (`buildWeeklyHeatmap`)

Varmekortstabel opdelt på dag × vagt — giver afdelingslederen et overblik over dage og vagter med forhøjet dødfødselsrate, til brug for personaleplanlægning.

### Paritetsanalyse (`buildParityAnalysis`)

Sammenligner ydeevnen på tværs af de 4 sogrupper og genererer automatisk en liste over søer, der bør overvejes **udsat**, når: paritet ≥ 6 OG dødfødte ≥ 3.

---

## 🔄 Samlet dataflow

```
Excel (AgroSoft/PigVision)
    ↓  readExcelData()
Normalisering + kolonnevalidering
    ↓  processAndGroupData()
Gruppering efter År → ISO-uge
    ↓  assessMMARisk() + getMedicinePatFar()
Mærkning af hver enkelt faring
    ↓  buildExecutiveSummary() + generateSvgBarChart()
        + buildWeeklyHeatmap() + buildParityAnalysis()
Ugentlig Markdown-rapport → eksport til .md-fil
    ↓
Årsrapport (Årsrapport) med trendanalyse for hele året
```

---

## 📝 Sammenfattende vurdering

Dette er en specialiseret BI-pipeline til **store sohold med ≥ 80 faringer pr. uge** (svarende til ca. 4.000 søer), der integrerer hele kæden fra rådata til zooteknisk vurdering, veterinær risikovurdering og ledelsesmæssig økonomirapportering — alt i overensstemmelse med DanBred/SEGES-standarden, som er den højeste faglige standard inden for dansk svineproduktion.
