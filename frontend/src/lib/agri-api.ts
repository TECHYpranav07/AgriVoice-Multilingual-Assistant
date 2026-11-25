import { DEMO_DOCS, DEMO_GLOSSARY, LOCATIONS, demoMandi, type GlossaryRow, type MandiRow } from "./agri-data";
import type { Lang } from "./agri-i18n";

export const DEFAULT_API =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "https://swapping-monoxide-thesaurus.ngrok-free.dev";

export const H = { "ngrok-skip-browser-warning": "true" };

export type QueryResponse = {
  success: boolean;
  query: string;
  language: string;
  intent?: string;
  entities?: unknown;
  answer_text: string;
  source_citation?: string;
  audio_url?: string | null;
  latency_seconds?: number;
  gate_decision?: { decision: string; reason_code?: string; message?: string };
  engine?: string;
  logs?: unknown;
  transcript?: string;
};
export type Weather = {
  location: string;
  temperature_c: number;
  humidity_percent: number;
  rain_mm: number;
  wind_speed_kmh: number;
  spray_advisory?: string;
  data_as_of?: string;
  source?: string;
};

async function j<T>(url: string, init?: RequestInit, ms = 15000): Promise<T> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, headers: { ...H, ...(init?.headers ?? {}) } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

export const health = (api: string) => j<{ status: string; vector_chunks: number }>(`${api}/health`, undefined, 6000);

export const queryText = (api: string, query: string, language: Lang) =>
  j<QueryResponse>(
    `${api}/api/query/text`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, language }) },
    60000
  );

export function queryVoice(api: string, blob: Blob, language: Lang) {
  const fd = new FormData();
  fd.append("file", blob, "recording.webm");
  fd.append("language", language);
  return j<QueryResponse>(`${api}/api/query/voice`, { method: "POST", body: fd }, 90000);
}

export async function fetchAudio(api: string, path: string) {
  const r = await fetch(`${api}${path}`, { headers: H });
  if (!r.ok) throw new Error("audio");
  return URL.createObjectURL(await r.blob());
}

function normalizeCommodityKey(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("cotton")) return "cotton";
  if (lower.includes("soybean")) return "soybean";
  if (lower.includes("wheat")) return "wheat";
  if (lower.includes("onion")) return "onion";
  if (lower.includes("gram") || lower.includes("chickpea")) return "gram";
  return lower;
}

export async function getMandi(api: string, commodity: string, location: string, online: boolean) {
  if (online) {
    try {
      const data = await j<{ selected: MandiRow; all_commodities: MandiRow[] }>(
        `${api}/api/mandi?commodity=${commodity}&location=${location}`
      );
      data.all_commodities = data.all_commodities.map((r) => ({
        ...r,
        commodity_key: normalizeCommodityKey(r.commodity),
      }));
      return data;
    } catch {
      /* fall back */
    }
  }
  return { ...demoMandi(commodity, location), demo: true };
}

export async function getWeather(api: string, location: string, online: boolean): Promise<Weather> {
  if (online) {
    try {
      return await j<Weather>(`${api}/api/weather?location=${location}`);
    } catch {
      /* fall back */
    }
  }
  const [lat, lon] = LOCATIONS[location] ?? LOCATIONS["nagpur"]!;
  const d = await j<{
    current: { temperature_2m: number; relative_humidity_2m: number; precipitation: number; wind_speed_10m: number; time: string };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`
  );
  return {
    location,
    temperature_c: d.current.temperature_2m,
    humidity_percent: d.current.relative_humidity_2m,
    rain_mm: d.current.precipitation,
    wind_speed_kmh: d.current.wind_speed_10m,
    data_as_of: d.current.time,
    source: "Open-Meteo (direct)",
  };
}
export const sprayUnsafe = (w: Weather) => w.wind_speed_kmh > 15 || w.rain_mm > 0.5;

export async function getKnowledge(api: string, online: boolean): Promise<{ documents: typeof DEMO_DOCS; glossary: GlossaryRow[] }> {
  if (online) {
    try {
      const d = await j<{ documents: typeof DEMO_DOCS; glossary: unknown }>(`${api}/api/knowledge`);
      return { documents: d.documents?.length ? d.documents : DEMO_DOCS, glossary: normalizeGlossary(d.glossary) };
    } catch {
      /* fall back */
    }
  }
  return { documents: DEMO_DOCS, glossary: DEMO_GLOSSARY };
}

function normalizeGlossary(g: unknown): GlossaryRow[] {
  if (Array.isArray(g)) return g as GlossaryRow[];
  if (g && typeof g === "object") {
    const rows: GlossaryRow[] = [];
    for (const [cat, v] of Object.entries(g as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        for (const [key, tr] of Object.entries(v as Record<string, { en?: string; hi?: string; mr?: string }>)) {
          if (tr?.hi || tr?.mr) {
            rows.push({
              en: tr.en ?? key,
              hi: tr.hi ?? "",
              mr: tr.mr ?? "",
              category: cat.replace(/_/g, " "),
            });
          }
        }
      }
    }
    if (rows.length) return rows;
  }
  return DEMO_GLOSSARY;
}

const DEMO_ANS: Record<string, Record<Lang, string>> = {
  pbw: {
    en: "For pink bollworm: install 5 pheromone traps per acre, remove rosette flowers, release Trichogramma, and spray neem oil 5%. Use chemicals only if 8 moths per trap per night for 3 nights.",
    hi: "गुलाबी सुंडी के लिए: प्रति एकड़ 5 फेरोमोन ट्रैप लगाएँ, गुलाब जैसे फूल तोड़ें, ट्राइकोग्रामा छोड़ें और 5% नीम तेल का छिड़काव करें। रसायन तभी, जब 3 रात लगातार प्रति ट्रैप 8 पतंगे मिलें।",
    mr: "गुलाबी बोंडअळीसाठी: एकरी 5 कामगंध सापळे लावा, डोमकळ्या तोडा, ट्रायकोग्रामा सोडा आणि 5% कडुलिंब तेल फवारा. सलग 3 रात्री सापळ्यात 8 पतंग आढळल्यासच रसायन वापरा.",
  },
  mandi: {
    en: "Cotton at Nagpur APMC today: modal ₹7,250 per quintal (min ₹6,800, max ₹7,500).",
    hi: "आज नागपुर मंडी में कपास: मॉडल भाव ₹7,250 प्रति क्विंटल (न्यूनतम ₹6,800, अधिकतम ₹7,500)।",
    mr: "आज नागपूर बाजार समितीत कापूस: सरासरी ₹7,250 प्रति क्विंटल (किमान ₹6,800, कमाल ₹7,500).",
  },
  weather: {
    en: "Spray only when wind is below 15 km/h and no rain is expected. Check the Mandi & Weather tab for live conditions.",
    hi: "हवा 15 किमी/घं से कम हो और बारिश न हो, तभी छिड़काव करें। लाइव मौसम ‘मंडी और मौसम’ टैब में देखें।",
    mr: "वारा 15 किमी/तास पेक्षा कमी असेल आणि पाऊस नसेल तेव्हाच फवारणी करा. थेट हवामान ‘मंडी व हवामान’ टॅबमध्ये पहा.",
  },
  kisan: {
    en: "PM-KISAN gives ₹6,000 per year in 3 instalments of ₹2,000 directly to your bank. e-KYC is mandatory.",
    hi: "PM-KISAN में सालाना ₹6,000, ₹2,000 की 3 किस्तों में सीधे बैंक खाते में मिलते हैं। e-KYC अनिवार्य है।",
    mr: "PM-KISAN मध्ये वर्षाला ₹6,000, ₹2,000 च्या 3 हप्त्यांत थेट बँक खात्यात मिळतात. e-KYC आवश्यक आहे.",
  },
  refuse: {
    en: "Using more than the label dose is unsafe for you, your crop and soil. I cannot advise this.",
    hi: "लेबल से अधिक मात्रा आपके, फसल और मिट्टी के लिए खतरनाक है। मैं यह सलाह नहीं दे सकता।",
    mr: "लेबलपेक्षा जास्त मात्रा तुमच्यासाठी, पिकासाठी आणि जमिनीसाठी धोकादायक आहे. मी हा सल्ला देऊ शकत नाही.",
  },
  general: {
    en: "I'm in demo mode. Please connect the backend for a full answer, or call Kisan Call Centre 1800-180-1551.",
    hi: "अभी डेमो मोड है। पूरा उत्तर पाने के लिए सर्वर जोड़ें या किसान कॉल सेंटर 1800-180-1551 पर कॉल करें।",
    mr: "सध्या डेमो मोड आहे. पूर्ण उत्तरासाठी सर्व्हर जोडा किंवा किसान कॉल सेंटर 1800-180-1551 वर कॉल करा.",
  },
};
export function demoAnswer(query: string, language: Lang): QueryResponse {
  const q = query.toLowerCase();
  const key = /double|दोगुन|दुप्पट|overdose|ज्यादा|जास्त/.test(q)
    ? "refuse"
    : /bollworm|सुंडी|बोंडअळी/.test(q)
      ? "pbw"
      : /mandi|मंडी|बाजार|rate|भाव/.test(q)
        ? "mandi"
        : /spray|छिड़काव|फवारणी|weather|मौसम|हवामान/.test(q)
          ? "weather"
          : /kisan|किसान|pm-kisan/.test(q)
            ? "kisan"
            : "general";
  const refuse = key === "refuse";
  return {
    success: true,
    query,
    language,
    intent: { pbw: "pest_management", mandi: "market_price", weather: "weather_advisory", kisan: "govt_scheme", refuse: "chemical_dosage", general: "general" }[key],
    entities: {},
    answer_text: DEMO_ANS[key]![language],
    source_citation: refuse ? "Safety gate" : "ICAR (demo)",
    audio_url: null,
    latency_seconds: 0.2,
    gate_decision: refuse
      ? { decision: "refuse", reason_code: "OVERDOSE_RISK", message: "Unsafe chemical dosage request" }
      : { decision: "proceed", reason_code: "VERIFIED" },
    engine: "demo-fallback",
    logs: ["Backend unreachable — local demo answer"],
  };
}
