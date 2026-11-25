import type { Lang } from "./agri-i18n";

export const COMMODITIES = ["cotton", "soybean", "wheat", "onion", "gram"] as const;
export const MANDIS = ["nagpur", "amravati", "akola", "pune", "nashik", "indore", "delhi"] as const;
export const LOCATIONS: Record<string, [number, number]> = {
  nagpur: [21.15, 79.09],
  pune: [18.52, 73.86],
  nashik: [20.0, 73.79],
  amravati: [20.93, 77.75],
  akola: [20.7, 77.0],
  indore: [22.72, 75.86],
  bhopal: [23.26, 77.41],
  delhi: [28.61, 77.21],
  solapur: [17.66, 75.91],
  aurangabad: [19.88, 75.34],
};
export const CROP_NAMES: Record<string, { hi: string; mr: string; en: string }> = {
  cotton: { hi: "कपास", mr: "कापूस", en: "Cotton" },
  soybean: { hi: "सोयाबीन", mr: "सोयाबीन", en: "Soybean" },
  wheat: { hi: "गेहूँ", mr: "गहू", en: "Wheat" },
  onion: { hi: "प्याज़", mr: "कांदा", en: "Onion" },
  gram: { hi: "चना", mr: "हरभरा", en: "Gram" },
};
const BASE: Record<string, number> = { cotton: 7250, soybean: 4450, wheat: 2850, onion: 2100, gram: 5850 };
const MANDI_ADJ: Record<string, number> = { nagpur: 0, amravati: -60, akola: -40, pune: 90, nashik: 50, indore: 30, delhi: 140 };
export type MandiRow = {
  commodity: string;
  commodity_key?: string;
  location?: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  unit?: string;
  data_as_of?: string;
};
export function demoMandi(commodity: string, location: string) {
  const all = COMMODITIES.map((c) => {
    const m = BASE[c]! + (MANDI_ADJ[location] ?? 0) * (c === "cotton" ? 1 : 0.5);
    return {
      commodity: c,
      commodity_key: c,
      location,
      modal_price: Math.round(m),
      min_price: Math.round(m * 0.94),
      max_price: Math.round(m * 1.05),
      unit: "Qtl",
    };
  });
  return { selected: all.find((r) => r.commodity === commodity)!, all_commodities: all };
}

export type TrilingualGuide = {
  id: string;
  badge: string;
  publisher: Record<Lang, string>;
  title: Record<Lang, string>;
  content: Record<Lang, string>;
  verifiedDate: string;
};

export const TRILINGUAL_GUIDES: TrilingualGuide[] = [
  {
    id: "cotton_pink_bollworm_advisory",
    badge: "☁️ Kharif IPM",
    verifiedDate: "2026-06-15",
    publisher: {
      en: "ICAR-CICR, Nagpur",
      hi: "ICAR-केंद्रीय कपास अनुसंधान संस्थान, नागपुर",
      mr: "ICAR-केंद्रीय कापूस संशोधन संस्था, नागपूर",
    },
    title: {
      en: "Cotton Pink Bollworm Management (ICAR-CICR)",
      hi: "कपास में गुलाबी सुंडी प्रबंधन (ICAR-CICR)",
      mr: "कापसावरील गुलाबी बोंडअळी व्यवस्थापन (ICAR-CICR)",
    },
    content: {
      en: `# Advisory on Pink Bollworm Management in Cotton
**Publisher:** ICAR - Central Institute for Cotton Research (CICR), Nagpur · **Status:** Verified

### 1. Identification & Symptoms
- Rosette (twisted/closed) flowers caused by larvae feeding inside buds.
- Larvae bore into tender green bolls and damage developing seeds and lint.

### 2. Economic Threshold Level (ETL)
- **8 to 10 adult moths** per pheromone trap per night for 3 consecutive nights, OR **10% damaged green bolls** with live larvae.

### 3. Integrated Management Measures
1. **Pheromone Traps:** Install **5 to 8 traps per hectare** at 45–60 days after sowing for monitoring (20–25/ha for mass trapping).
2. **Biological Control:** Release *Trichogramma bactrae* egg parasitoids @ 1,50,000/ha weekly; spray **Neem Oil 1500 ppm @ 5 ml/L** (or 5% NSKE) at initial stage.
3. **Recommended Chemical (only above ETL):**
   - **Chlorantraniliprole 18.5% SC** @ **3 ml per 10 litres of water**, OR
   - **Emamectin benzoate 5% SG** @ **4 grams per 10 litres of water**.

> **Safety Warning:** Wear protective gear. Never spray in strong wind or exceed recommended dose. Consult local KVK before application.`,
      hi: `# कपास में गुलाबी सुंडी (Pink Bollworm) प्रबंधन सलाह
**प्रकाशक:** ICAR - केंद्रीय कपास अनुसंधान संस्थान (CICR), नागपुर · **स्थिति:** सत्यापित

### 1. पहचान और लक्षण
- गुलाबी सुंडी के प्रकोप से कपास के फूल मुड़कर गुलाब के आकार (**रोझेट फूल**) जैसे बन जाते हैं।
- इल्लियाँ हरे गूलर (टिंडों) के अंदर घुसकर बीज और रुई को नष्ट कर देती हैं, जिससे गूलर सड़ने लगते हैं।

### 2. आर्थिक क्षति स्तर (ETL)
- लगातार 3 रात तक प्रति फेरोमोन ट्रैप में **8 से 10 पतंगे** पकड़े जाएँ, या **10% हरे टिंडों** में जीवित सुंडी मिले।

### 3. समन्वित कीट प्रबंधन (IPM) उपाय
1. **फेरोमोन ट्रैप:** बुवाई के 45 से 60 दिन बाद निगरानी के लिए **प्रति हेक्टेयर 5 से 8 फेरोमोन ट्रैप** लगाएँ (सामूहिक पकड़ के लिए 20–25 ट्रैप/हेक्टेयर)।
2. **जैविक व नीम आधारित उपाय:** साप्ताहिक अंतराल पर *ट्राइकोग्रामा बैक्ट्री* (1,50,000/हेक्टेयर) छोड़ें और शुरुआती अवस्था में **नीम का तेल 1500 ppm (5 मिली प्रति लीटर पानी)** या 5% NSKE का छिड़काव करें।
3. **रासायनिक नियंत्रण (केवल ETL से ऊपर):**
   - **क्लोरेंट्रानिलिप्रोल 18.5% SC:** **3 मिली प्रति 10 लीटर पानी**, या
   - **इमामेक्टिन बेंजोएट 5% SG:** **4 ग्राम प्रति 10 लीटर पानी** में मिलाकर छिड़काव करें।

> **सुरक्षा चेतावनी:** सुरक्षा उपकरण पहनकर ही छिड़काव करें। तेज़ हवा में स्प्रे न करें और कभी भी डोज दोगुना न करें। उपयोग से पहले नजदीकी KVK से सलाह लें।`,
      mr: `# कापसावरील गुलाबी बोंडअळी व्यवस्थापन सल्ला
**प्रकाशक:** ICAR - केंद्रीय कापूस संशोधन संस्था (CICR), नागपूर · **स्थिती:** प्रमाणित

### १. ओळख व लक्षणे
- गुलाबी बोंडअळीच्या प्रादुर्भावामुळे कापसाची फुले गुलाबाच्या आकारासारखी (**डोमकळी / रोझेट फुले**) बंद होतात.
- अळ्या हिरव्या बोंडांत शिरून बिया व कापूस खातात, त्यामुळे बोंडे सडतात आणि कापसाची प्रत खराब होते.

### २. आर्थिक नुकसान पातळी (ETL)
- सलग ३ रात्री प्रति कामगंध सापळ्यात **८ ते १० पतंग** आढळणे, किंवा **१०% हिरव्या बोंडांमध्ये** जिवंत अळी आढळणे.

### ३. एकात्मिक कीड व्यवस्थापन (IPM) उपाय
1. **कामगंध सापळे (Pheromone Traps):** पेरणीनंतर ४५ ते ६० दिवसांनी निरीक्षणासाठी **हेक्टरी ५ ते ८ सापळे** लावा (मोठ्या प्रमाणावर नियंत्रणासाठी २०–२५ सापळे/हेक्टरी).
2. **जैविक व सेंद्रिय उपाय:** दर आठवड्याला *ट्रायकोग्रामा बॅक्ट्री* (१,५०,०००/हेक्टरी) सोडा आणि सुरुवातीला **कडुनिंब तेल १५०० ppm (५ मिली प्रति लिटर पाणी)** किंवा ५% निंबोळी अर्काची फवारणी करा.
3. **रासायनिक फवारणी (फक्त ETL नंतरच):**
   - **क्लोरँट्रानिलिप्रोल १८.५% SC:** **३ मिली प्रति १० लिटर पाणी**, किंवा
   - **इमामेक्टिन बेंझोएट ५% SG:** **४ ग्रॅम प्रति १० लिटर पाणी**.

> **सुरक्षा सूचना:** फवारणी करताना संरक्षक कपडे व मास्क वापरा. जोरदार वाऱ्यात फवारणी करू नका आणि कधीही दुप्पट डोस वापरू नका.`,
    },
  },
  {
    id: "soybean_yellow_mosaic_advisory",
    badge: "🫘 Kharif Disease",
    verifiedDate: "2026-07-10",
    publisher: {
      en: "ICAR-IISR, Indore",
      hi: "ICAR-भारतीय सोयाबीन अनुसंधान संस्थान, इंदौर",
      mr: "ICAR-भारतीय सोयाबीन संशोधन संस्था, इंदूर",
    },
    title: {
      en: "Soybean Yellow Mosaic Virus (ICAR-IISR)",
      hi: "सोयाबीन पीला मोज़ेक वायरस प्रबंधन (ICAR-IISR)",
      mr: "सोयाबीन पिवळा मोझॅक व्हायरस व्यवस्थापन (ICAR-IISR)",
    },
    content: {
      en: `# Advisory on Yellow Mosaic Virus Management in Soybean
**Publisher:** ICAR - Indian Institute of Soybean Research (IISR), Indore · **Status:** Verified

### 1. Symptoms & Transmission
- Bright yellow patches alternating with green on leaves; leaves turn yellow and brittle.
- **Vector:** Transmitted exclusively by **Whiteflies** (*Bemisia tabaci*), not by soil or touch.

### 2. Prevention & Management
1. **Rogueing Out:** Immediately uproot and destroy virus-infected plants during the first 30 days.
2. **Yellow Sticky Traps:** Install **15 to 20 yellow sticky traps per hectare** to monitor whiteflies.
3. **Vector Control:**
   - Early stage: **Neem Oil 1500 ppm @ 3 ml per litre of water**.
   - High whitefly population: **Thiamethoxam 25% WG @ 4 g / 10 L water**, or **Acetamiprid 20% SP @ 2 g / 10 L water**.

> **Safety Advisory:** Follow exact dilutions; never spray during noon heat or rain.`,
      hi: `# सोयाबीन में पीला मोज़ेक वायरस (YMV) प्रबंधन सलाह
**प्रकाशक:** ICAR - भारतीय सोयाबीन अनुसंधान संस्थान (IISR), इंदौर · **स्थिति:** सत्यापित

### 1. लक्षण और रोग का फैलाव
- सोयाबीन की पत्तियों पर हरे भाग के बीच चमकदार पीले धब्बे व पट्टियाँ बनती हैं; बाद में पूरी पत्ती पीली पड़कर भुरभुरी हो जाती है और फलियों में दाने नहीं बनते।
- **रोग वाहक:** यह वायरस केवल **सफेद मक्खी (Whitefly)** द्वारा फैलता है, मिट्टी या छूने से नहीं।

### 2. रोकथाम और नियंत्रण उपाय
1. **रोगग्रस्त पौधे निकालना (Rogueing):** बुवाई के पहले 30 दिनों में संक्रमित पौधों को तुरंत उखाड़कर नष्ट कर दें।
2. **पीले चिपचिपे ट्रैप (Yellow Sticky Traps):** सफेद मक्खी को पकड़ने व निगरानी के लिए **प्रति हेक्टेयर 15 से 20 पीले चिपचिपे ट्रैप** लगाएँ।
3. **सफेद मक्खी नियंत्रण:**
   - शुरुआती अवस्था में: **नीम का तेल 1500 ppm @ 3 मिली प्रति लीटर पानी** में छिड़कें।
   - प्रकोप अधिक होने पर: **थायोमेथोक्साम 25% WG (4 ग्राम / 10 लीटर पानी)** या **एसिटामिप्रिड 20% SP (2 ग्राम / 10 लीटर पानी)** का छिड़काव करें।

> **सुरक्षा सलाह:** निर्धारित मात्रा का सख्ती से पालन करें। दोपहर की तेज़ धूप या बारिश में छिड़काव न करें।`,
      mr: `# सोयाबीनवरील पिवळा मोझॅक व्हायरस (YMV) व्यवस्थापन सल्ला
**प्रकाशक:** ICAR - भारतीय सोयाबीन संशोधन संस्था (IISR), इंदूर · **स्थिती:** प्रमाणित

### १. लक्षणे व प्रसार
- सोयाबीनच्या पानांवर पिवळे व हिरवे पट्टे दिसतात; तीव्र प्रादुर्भावात संपूर्ण पान पिवळे पडते आणि शेंगा व दाणे भरत नाहीत.
- **प्रसारक कीड:** हा विषाणू फक्त **पांढऱ्या माशीद्वारे (Whitefly)** पसरतो; माती किंवा स्पर्शाने पसरत नाही.

### २. प्रतिबंध व नियंत्रण उपाय
1. **रोगट झाडे उपटणे:** पेरणीनंतर पहिल्या ३० दिवसांत पिवळा मोझॅक दिसलेली झाडे ताबडतोब उपटून नष्ट करावीत.
2. **पिवळे चिकट सापळे:** पांढऱ्या माशीच्या नियंत्रणासाठी **हेक्टरी १५ ते २० पिवळे चिकट सापळे (Yellow Sticky Traps)** लावावेत.
3. **पांढऱ्या माशीचे नियंत्रण:**
   - सुरुवातीच्या टप्प्यात: **कडुनिंब तेल १५०० ppm (३ मिली प्रति लिटर पाणी)** फवारावे.
   - प्रादुर्भाव जास्त असल्यास: **थायामेथोक्साम २५% WG (४ ग्रॅम / १० लिटर पाणी)** किंवा **ॲसिटामिप्रिड २०% SP (२ ग्रॅम / १० लिटर पाणी)** फवारावे.

> **सुरक्षा सल्ला:** शिफारस केलेले प्रमाणच वापरा. भर दुपारी किंवा पावसाची शक्यता असताना फवारणी टाळा.`,
    },
  },
  {
    id: "wheat_rust_and_irrigation",
    badge: "🌾 Rabi Guide",
    verifiedDate: "2026-03-01",
    publisher: {
      en: "ICAR-IIWBR, Karnal",
      hi: "ICAR-भारतीय गेहूं एवं जौ अनुसंधान संस्थान, करनाल",
      mr: "ICAR-भारतीय गहू व बार्ली संशोधन संस्था, कर्नाल",
    },
    title: {
      en: "Wheat Yellow Rust & Critical Irrigation (ICAR-IIWBR)",
      hi: "गेहूँ में सिंचाई अवस्थाएँ और पीला रतुआ नियंत्रण",
      mr: "गहू सिंचन टप्पे आणि पिवळा तांबेरा नियंत्रण",
    },
    content: {
      en: `# ICAR Advisory on Wheat Crop Management and Yellow Rust
**Publisher:** ICAR - IIWBR, Karnal · **Status:** Verified

### 1. Critical Irrigation Stages (4 to 6 irrigations)
1. **Crown Root Initiation (CRI):** 20–25 DAS *(Most crucial; missing reduces yield 25–30%)*
2. **Tillering:** 40–45 DAS
3. **Jointing:** 60–65 DAS
4. **Flowering:** 80–85 DAS
5. **Milking:** 100–105 DAS
6. **Dough stage:** 115–120 DAS

### 2. Yellow Rust (Stripe Rust) Control
- **Symptoms:** Yellow powdery stripes along leaf veins; yellow powder sticks to fingers when rubbed.
- **Control:** Spray **Propiconazole 25% EC @ 1 ml/L water** (200 ml in 200 L/acre) at first sight; repeat after 15 days only if needed. Avoid excess urea.`,
      hi: `# गेहूँ सिंचाई अवस्थाएँ और पीला रतुआ (Yellow Rust) प्रबंधन
**प्रकाशक:** ICAR - भारतीय गेहूं एवं जौ अनुसंधान संस्थान (IIWBR), करनाल · **स्थिति:** सत्यापित

### 1. सिंचाई की मुख्य क्रांतिक अवस्थाएँ
1. **ताज जड़ बनना (CRI अवस्था):** बुवाई के **20–25 दिन बाद** *(सबसे महत्वपूर्ण; चूकने पर 25–30% उपज घटती है)*
2. **कल्ले फूटने की अवस्था:** 40–45 दिन बाद
3. **गाँठ बनते समय:** 60–65 दिन बाद
4. **फूल आने पर:** 80–85 दिन बाद
5. **दुधिया अवस्था:** 100–105 दिन बाद
6. **दाना पकने की अवस्था:** 115–120 दिन बाद

### 2. पीला रतुआ (धारीदार रतुआ) पहचान व नियंत्रण
- **लक्षण:** पत्तियों की नसों के साथ पीली धारियाँ बनती हैं और छूने पर उंगलियों पर पीला पाउडर लगता है।
- **नियंत्रण:** शुरुआती लक्षण दिखते ही **प्रोपीकोनाजोल 25% EC @ 1 मिली प्रति लीटर पानी** (200 मिली दवा 200 लीटर पानी में प्रति एकड़) का छिड़काव करें। आवश्यकता होने पर 15 दिन बाद दोहराएँ। अधिक यूरिया न डालें।`,
      mr: `# गहू सिंचन टप्पे आणि पिवळा तांबेरा (Yellow Rust) नियंत्रण
**प्रकाशक:** ICAR - भारतीय गहू व बार्ली संशोधन संस्था (IIWBR), कर्नाल · **स्थिती:** प्रमाणित

### १. गव्हाच्या सिंचनाच्या महत्त्वाच्या अवस्था (४ ते ६ पाळ्या)
1. **मुकुट मुळे फुटण्याची अवस्था (CRI):** पेरणीनंतर **२० ते २५ दिवस** *(अत्यंत महत्त्वाची; ही पाळी चुकल्यास २५–३०% उत्पादन घटते)*
2. **फुटवे येण्याची अवस्था:** ४० ते ४५ दिवस
3. **कांडी धरण्याची अवस्था:** ६० ते ६५ दिवस
4. **फुलोरा अवस्था:** ८० ते ८५ दिवस
5. **दाण्यात चीक भरण्याची अवस्था:** १०० ते १०५ दिवस
6. **दाणे पक्व होण्याची अवस्था:** ११५ ते १२० दिवस

### २. पिवळा तांबेरा (पट्टेरी तांबेरा) लक्षणे व उपाय
- **लक्षणे:** पानांवर पिवळ्या रंगाचे सरळ पट्टे दिसतात आणि बोटांनी घासल्यास हाताला पिवळी पावडर लागते.
- **नियंत्रण:** लक्षणे दिसताच **प्रोपीकोनाझोल २५% EC (१ मिली प्रति लिटर पाणी)** — म्हणजेच एकरी २०० लिटर पाण्यात २०० मिली औषध फवारावे. गरज असल्यास १५ दिवसांनी पुन्हा फवारणी करा. जास्त युरिया वापरणे टाळा.`,
    },
  },
  {
    id: "pm_kisan_samman_nidhi",
    badge: "💰 Central Scheme",
    verifiedDate: "2026-01-01",
    publisher: {
      en: "Ministry of Agriculture, GoI",
      hi: "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
      mr: "कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार",
    },
    title: {
      en: "PM-KISAN Samman Nidhi Guidelines",
      hi: "पीएम किसान सम्मान निधि योजना (₹6,000/वर्ष)",
      mr: "पीएम किसान सन्मान निधी योजना (₹६,०००/वर्ष)",
    },
    content: {
      en: `# Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)
**Publisher:** Ministry of Agriculture & Farmers Welfare, GoI · **Status:** Verified

### 1. Scheme Benefits
- **₹6,000 per year** transferred directly to Aadhaar-linked bank accounts of eligible landholding farmer families in **3 equal installments of ₹2,000** every 4 months.

### 2. Mandatory Requirements
1. **e-KYC:** Complete via OTP on \`pmkisan.gov.in\` or biometric at your nearest CSC.
2. **Land Seeding:** Land records (7/12 / Khasra-Khatauni) must be verified on the state portal.
3. **Aadhaar-Bank DBT Seeding:** Bank account must be Aadhaar-seeded with NPCI active.

### 3. Helpline
- **PM-KISAN Toll-Free:** \`155261\` / \`1800-115-526\` · **Kisan Call Centre:** \`1800-180-1551\``,
      hi: `# प्रधानमंत्री किसान सम्मान निधि (PM-KISAN) दिशानिर्देश
**प्रकाशक:** कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार · **स्थिति:** सत्यापित

### 1. योजना के लाभ
- पात्र खेतीहर किसान परिवारों को प्रति वर्ष **₹6,000 की आर्थिक सहायता** सीधे आधार-लिंक्ड बैंक खाते (DBT) में **₹2,000 की 3 समान किश्तों** में हर 4 महीने पर दी जाती है।

### 2. किश्त पाने के लिए 3 अनिवार्य शर्तें
1. **ई-केवाईसी (e-KYC):** \`pmkisan.gov.in\` पोर्टल पर OTP द्वारा या नजदीकी CSC केंद्र से बायोमेट्रिक द्वारा कराना अनिवार्य है।
2. **भूलेख अंकन (Land Seeding):** खसरा/खतौनी या 7/12 जमीन रिकॉर्ड का पोर्टल पर सत्यापन होना ज़रूरी है।
3. **आधार-बैंक डीबीटी लिंकिंग:** बैंक खाता आधार से लिंक और NPCI DBT के लिए सक्रिय होना चाहिए।

### 3. हेल्पलाइन नंबर
- **PM-KISAN टोल-फ्री:** \`155261\` / \`1800-115-526\` · **किसान कॉल सेंटर:** \`1800-180-1551\``,
      mr: `# प्रधानमंत्री किसान सन्मान निधी योजना (PM-KISAN) मार्गदर्शक तत्त्वे
**प्रकाशक:** कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार · **स्थिती:** प्रमाणित

### १. योजनेचा मुख्य लाभ
- पात्र शेतकरी कुटुंबांना दरवर्षी **₹६,००० ची आर्थिक मदत** थेट आधार-संलग्न बँक खात्यात (DBT) **₹२,००० च्या ३ समान हप्त्यांमध्ये** (दर ४ महिन्यांनी) जमा केली जाते।

### २. हप्ता मिळण्यासाठी ३ आवश्यक बाबी
1. **ई-केवायसी (e-KYC):** \`pmkisan.gov.in\` वर OTP द्वारे किंवा जवळच्या CSC केंद्रातून पूर्ण करणे बंधनकारक आहे.
2. **जमीन पडताळणी (Land Seeding):** शेतकऱ्याचा ७/१२ उतारा व जमीन नोंदणी पोर्टलवर अद्ययावत असणे आवश्यक आहे.
3. **आधार-बँक DBT जोडणी:** बँक खात्याशी आधार कार्ड लिंक असून NPCI मॅपिंग सुरू असावे.

### ३. मदत व तक्रार क्रमांक
- **PM-KISAN टोल-फ्री:** \`155261\` / \`1800-115-526\` · **किसान कॉल सेंटर:** \`1800-180-1551\``,
    },
  },
  {
    id: "pmfby_crop_insurance_guide",
    badge: "🛡️ Crop Insurance",
    verifiedDate: "2026-02-15",
    publisher: {
      en: "PMFBY Directorate, GoI",
      hi: "PMFBY निदेशालय, भारत सरकार",
      mr: "PMFBY संचालनालय, भारत सरकार",
    },
    title: {
      en: "PMFBY Crop Insurance & 72-Hour Claim Rule",
      hi: "प्रधानमंत्री फसल बीमा योजना (72 घंटे दावा नियम)",
      mr: "प्रधानमंत्री पीक विमा योजना (७२ तास तक्रार नियम)",
    },
    content: {
      en: `# Pradhan Mantri Fasal Bima Yojana (PMFBY)
**Publisher:** PMFBY Directorate, Ministry of Agriculture · **Status:** Verified

### 1. Farmer Premium Rates
- **Kharif Crops:** Max **2.0%** of Sum Insured
- **Rabi Crops:** Max **1.5%** of Sum Insured
- **Annual Commercial / Horticultural:** Max **5.0%** of Sum Insured

### 2. Crucial 72-Hour Claim Rule
- For localized calamities (hailstorm, inundation, cloudburst, unseasonal rain) or post-harvest losses (up to 14 days), the farmer **MUST report crop loss within 72 hours**:
  1. **Crop Insurance Mobile App**
  2. **Toll-Free Krishi Rakshak Helpline:** \`14447\`
  3. Local Agriculture Officer, Bank, or Insurance Agent.`,
      hi: `# प्रधानमंत्री फसल बीमा योजना (PMFBY) मार्गदर्शिका
**प्रकाशक:** कृषि एवं किसान कल्याण मंत्रालय / PMFBY निदेशालय · **स्थिति:** सत्यापित

### 1. किसानों के लिए प्रीमियम दरें
- **खरीफ फसलें (अनाज व तिलहन):** अधिकतम **2.0%**
- **रबी फसलें:** अधिकतम **1.5%**
- **वार्षिक वाणिज्यिक व बागवानी फसलें:** अधिकतम **5.0%**

### 2. प्राकृतिक आपदा के लिए महत्वपूर्ण 72 घंटे का नियम
- ओलावृष्टि, जलभराव, बादल फटने, बेमौसम बारिश या कटाई के बाद नुकसान (कटाई के 14 दिन के भीतर) की स्थिति में किसान को **72 घंटे के भीतर सूचना देना अनिवार्य** है:
  1. **फसल बीमा ऐप (Crop Insurance App)** द्वारा
  2. **टोल-फ्री हेल्पलाइन:** \`14447\`
  3. नजदीकी कृषि अधिकारी, बैंक या बीमा कंपनी प्रतिनिधि को।`,
      mr: `# प्रधानमंत्री पीक विमा योजना (PMFBY) मार्गदर्शक
**प्रकाशक:** कृषी मंत्रालय / PMFBY संचालनालय, भारत सरकार · **स्थिती:** प्रमाणित

### १. शेतकऱ्यांचा विमा हप्ता (प्रीमियम दर)
- **खरीप पिके:** कमाल **२.०%**
- **रबी पिके:** कमाल **१.५%**
- **वार्षिक नगदी व फळबाग पिके:** कमाल **५.०%**

### २. नुकसानीच्या तक्रारीसाठी महत्त्वाचा ७२ तासांचा नियम
- गारपीट, अतिवृष्टी, भूस्खलन किंवा कापणीनंतर १४ दिवसांच्या आत नुकसान झाल्यास शेतकऱ्याने **७२ तासांच्या आत पूर्वसूचना देणे बंधनकारक** आहे:
  1. **Crop Insurance (पीक विमा) मोबाईल अ‍ॅप** द्वारे
  2. **टोल-फ्री क्रमांक:** \`14447\`
  3. कृषी अधिकारी, संबंधित बँक किंवा विमा कंपनी प्रतिनिधीकडे तक्रार नोंदवा.`,
    },
  },
];

export const DEMO_DOCS = TRILINGUAL_GUIDES.map((g) => ({
  id: g.id,
  filename: g.title.en,
  content: g.content.en,
}));

export const DEMO_GLOSSARY = [
  { en: "Cotton", hi: "कपास", mr: "कापूस", category: "Crop" },
  { en: "Soybean", hi: "सोयाबीन", mr: "सोयाबीन", category: "Crop" },
  { en: "Wheat", hi: "गेहूँ", mr: "गहू", category: "Crop" },
  { en: "Onion", hi: "प्याज़", mr: "कांदा", category: "Crop" },
  { en: "Gram (Chickpea)", hi: "चना", mr: "हरभरा", category: "Crop" },
  { en: "Pink Bollworm", hi: "गुलाबी सुंडी", mr: "गुलाबी बोंडअळी", category: "Pest" },
  { en: "Whitefly", hi: "सफेद मक्खी", mr: "पांढरी माशी", category: "Pest" },
  { en: "Aphid", hi: "माहू", mr: "मावा", category: "Pest" },
  { en: "Rust", hi: "रतुआ", mr: "तांबेरा", category: "Disease" },
  { en: "Yellow Mosaic", hi: "पीला मोज़ेक", mr: "पिवळा मोझॅक", category: "Disease" },
  { en: "Pesticide", hi: "कीटनाशक", mr: "कीटकनाशक", category: "Chemical" },
  { en: "Fungicide", hi: "फफूंदनाशक", mr: "बुरशीनाशक", category: "Chemical" },
  { en: "Neem oil", hi: "नीम तेल", mr: "कडुलिंब तेल", category: "Chemical" },
  { en: "Pheromone trap", hi: "फेरोमोन ट्रैप", mr: "कामगंध सापळा", category: "IPM" },
  { en: "Crop insurance", hi: "फसल बीमा", mr: "पीक विमा", category: "Scheme" },
  { en: "Market yard (APMC)", hi: "कृषि उपज मंडी", mr: "बाजार समिती", category: "Market" },
];
export type GlossaryRow = { en: string; hi: string; mr: string; category?: string };
