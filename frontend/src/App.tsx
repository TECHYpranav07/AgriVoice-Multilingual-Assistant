import { useCallback, useEffect, useState } from "react";
import { Settings, Mic, LineChart, BookOpen, Phone, X } from "lucide-react";
import { t, type Lang } from "@/lib/agri-i18n";
import { DEFAULT_API, health } from "@/lib/agri-api";
import { AskTab } from "@/components/agri/AskTab";
import { MandiWeatherTab } from "@/components/agri/MandiWeatherTab";
import { GuidesTab } from "@/components/agri/GuidesTab";

type Tab = "ask" | "mandi" | "guides";
const LANGS: [Lang, string][] = [
  ["hi", "हिंदी"],
  ["mr", "मराठी"],
  ["en", "English"],
];

export default function App() {
  const [lang, setLang] = useState<Lang>("mr");
  const [tab, setTab] = useState<Tab>("ask");
  const [api, setApi] = useState(DEFAULT_API);
  const [online, setOnline] = useState(false);
  const [chunks, setChunks] = useState<number | null>(null);
  const [showSet, setShowSet] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_API);

  useEffect(() => {
    const a = localStorage.getItem("agrivoice_api");
    if (a) {
      setApi(a);
      setDraft(a);
    }
    const l = localStorage.getItem("agrivoice_lang") as Lang | null;
    if (l) setLang(l);
  }, []);
  const check = useCallback(() => {
    health(api)
      .then((h) => {
        setOnline(h.status === "healthy");
        setChunks(h.vector_chunks);
      })
      .catch(() => {
        setOnline(false);
        setChunks(null);
      });
  }, [api]);
  useEffect(() => {
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [check]);

  const tabs: [Tab, string, React.ReactNode][] = [
    ["ask", t("tabAsk", lang), <Mic key="a" />],
    ["mandi", t("tabMandi", lang), <LineChart key="b" />],
    ["guides", t("tabGuides", lang), <BookOpen key="c" />],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="font-display text-xl font-semibold text-primary">🌾 AgriVoice</p>
            <p className="text-xs text-muted-foreground">{t("subtitle", lang)}</p>
          </div>
          <div className="flex rounded-full border border-border bg-card p-1">
            {LANGS.map(([k, n]) => (
              <button
                key={k}
                onClick={() => {
                  setLang(k);
                  localStorage.setItem("agrivoice_lang", k);
                }}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  lang === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-primary" : "bg-marigold"}`} />
            {online ? t("connected", lang) : t("demo", lang)}
          </span>
          <button
            onClick={() => setShowSet(true)}
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map(([k, n, ic]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {ic}
              {n}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "ask" && <AskTab lang={lang} api={api} online={online} />}
        {tab === "mandi" && <MandiWeatherTab lang={lang} api={api} online={online} />}
        {tab === "guides" && <GuidesTab lang={lang} api={api} online={online} />}
      </main>

      <footer className="border-t border-border py-5 text-center text-sm text-muted-foreground">
        {t("kcc", lang)}:{" "}
        <a href="tel:18001801551" className="inline-flex items-center gap-1 font-semibold text-primary">
          <Phone className="h-3.5 w-3.5" />
          1800-180-1551
        </a>
      </footer>

      {showSet && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-foreground/30 p-4" onClick={() => setShowSet(false)}>
          <div className="card-soft w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Backend API URL</h3>
              <button onClick={() => setShowSet(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">{online ? `${t("connected", lang)} · ${chunks ?? 0} vector chunks` : t("demo", lang)}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDraft(DEFAULT_API)} className="rounded-xl border border-border px-4 py-2 text-sm">
                Reset
              </button>
              <button
                onClick={() => {
                  const v = draft.trim().replace(/\/$/, "");
                  setApi(v);
                  localStorage.setItem("agrivoice_api", v);
                  setShowSet(false);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
