import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Search, ShieldCheck, Calendar, Building2, Volume2, Loader2 } from "lucide-react";
import { t, type Lang } from "@/lib/agri-i18n";
import { DEMO_GLOSSARY, TRILINGUAL_GUIDES, type GlossaryRow } from "@/lib/agri-data";
import { fetchAudio, getKnowledge, queryText } from "@/lib/agri-api";

export function GuidesTab({ lang, api, online }: { lang: Lang; api: string; online: boolean }) {
  const [gl, setGl] = useState<GlossaryRow[]>(DEMO_GLOSSARY);
  const [sel, setSel] = useState(0);
  const [q, setQ] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [guideAudio, setGuideAudio] = useState<string | null>(null);

  useEffect(() => {
    getKnowledge(api, online).then((k) => {
      if (k.glossary?.length) setGl(k.glossary);
    });
  }, [api, online]);

  useEffect(() => {
    setGuideAudio(null);
  }, [sel, lang]);

  const rows = useMemo(
    () => gl.filter((r) => [r.en, r.hi, r.mr, r.category].join(" ").toLowerCase().includes(q.toLowerCase())),
    [gl, q]
  );
  const guide = TRILINGUAL_GUIDES[sel] ?? TRILINGUAL_GUIDES[0]!;

  async function listenToSummary() {
    if (speaking) return;
    setSpeaking(true);
    try {
      if (online) {
        const res = await queryText(api, guide.title[lang], lang);
        if (res.audio_url) {
          const url = await fetchAudio(api, res.audio_url);
          setGuideAudio(url);
        }
      } else if ("speechSynthesis" in window) {
        const plain = guide.content[lang].replace(/[#>*_`]/g, "").slice(0, 350);
        const utter = new SpeechSynthesisUtterance(plain);
        utter.lang = lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    } catch {
      /* ignore */
    } finally {
      setSpeaking(false);
    }
  }

  const listenLabel: Record<Lang, string> = {
    hi: "सारांश सुनें",
    mr: "सारांश ऐका",
    en: "Listen Summary",
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="card-soft h-fit p-2.5 space-y-1">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🌾 {t("guides", lang)} ({TRILINGUAL_GUIDES.length})
          </p>
          {TRILINGUAL_GUIDES.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSel(i)}
              className={`sticker-pill flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left text-sm ${
                i === sel ? "bg-primary-soft font-semibold text-primary border border-primary/20" : "hover:bg-muted"
              }`}
            >
              <span className="text-xs opacity-80">{g.badge}</span>
              <span>{g.title[lang]}</span>
            </button>
          ))}
        </div>

        <article className="card-soft p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("verified", lang)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {guide.publisher[lang]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {guide.verifiedDate}
              </span>
            </div>

            <button
              onClick={listenToSummary}
              disabled={speaking}
              className="sticker-pill inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              {speaking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
              {listenLabel[lang]}
            </button>
          </div>

          {guideAudio && (
            <div className="mb-4 rounded-xl bg-primary-soft/60 p-2.5">
              <audio controls autoPlay src={guideAudio} className="h-9 w-full" />
            </div>
          )}

          <div className="prose-agri">
            <ReactMarkdown>{guide.content[lang]}</ReactMarkdown>
          </div>
        </article>
      </section>

      <section className="card-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-primary">🔤 {t("glossary", lang)}</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search", lang)}
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3"
            />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 font-medium">English</th>
                <th className="font-medium">हिंदी</th>
                <th className="font-medium">मराठी</th>
                <th className="font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.en + (r.category ?? "")} className="border-t border-border hover:bg-muted/40">
                  <td className="py-2.5 font-medium">{r.en}</td>
                  <td>{r.hi}</td>
                  <td>{r.mr}</td>
                  <td>
                    {r.category && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{r.category}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
