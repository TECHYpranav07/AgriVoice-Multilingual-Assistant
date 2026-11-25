import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Send,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Phone,
  BookOpen,
  Target,
  Timer,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { QUICK, t, type Lang } from "@/lib/agri-i18n";
import { demoAnswer, fetchAudio, queryText, queryVoice, type QueryResponse } from "@/lib/agri-api";
import { FarmerMascotSticker, VoiceWaveSticker } from "@/components/agri/FarmStickers";

const CHIP_STICKERS = ["🐛", "🏛️", "⛅", "💰", "⚠️"];

export function AskTab({ lang, api, online }: { lang: Lang; api: string; online: boolean }) {
  const [text, setText] = useState("");
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<QueryResponse | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [err, setErr] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!rec) return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [rec]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function handle(r: QueryResponse) {
    setRes(r);
    setFeedback(null);
    setAudioUrl(null);
    if (r.audio_url) {
      try {
        setAudioUrl(await fetchAudio(api, r.audio_url));
      } catch {
        /* no audio */
      }
    }
  }
  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setErr("");
    setUsedVoice(false);
    try {
      await handle(online ? await queryText(api, q, lang) : demoAnswer(q, lang));
    } catch {
      await handle(demoAnswer(q, lang));
    } finally {
      setBusy(false);
    }
  }
  async function toggleMic() {
    if (rec) {
      mr.current?.stop();
      return;
    }
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "" });
      chunks.current = [];
      m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      m.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRec(false);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setBusy(true);
        setUsedVoice(true);
        try {
          if (!online) throw new Error("offline");
          await handle(await queryVoice(api, blob, lang));
        } catch {
          await handle({ ...demoAnswer("", lang), transcript: "(demo — voice needs the backend)" });
        } finally {
          setBusy(false);
        }
      };
      mr.current = m;
      m.start();
      setSecs(0);
      setRec(true);
    } catch {
      setErr(t("micDenied", lang));
    }
  }

  const refused = res?.gate_decision?.decision === "refuse";
  const transcript = res?.transcript ?? res?.query;

  const fbText: Record<Lang, { ask: string; thanksUp: string; thanksDown: string }> = {
    hi: { ask: "क्या यह सलाह उपयोगी रही?", thanksUp: "धन्यवाद! आपका फ़ीडबैक सहेजा गया 🙏", thanksDown: "कृपया 1800-180-1551 पर विशेषज्ञ से बात करें" },
    mr: { ask: "हा सल्ला उपयुक्त होता का?", thanksUp: "धन्यवाद! तुमचा अभिप्राय जतन केला 🙏", thanksDown: "कृपया 1800-180-1551 वर तज्ज्ञांशी संपर्क साधा" },
    en: { ask: "Was this answer helpful?", thanksUp: "Thank you! Feedback recorded 🙏", thanksDown: "Please contact KCC 1800-180-1551 for expert review" },
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <FarmerMascotSticker lang={lang} />
      </div>

      <section className="card-soft flex flex-col items-center px-5 py-7 text-center">
        <button
          onClick={toggleMic}
          disabled={busy}
          aria-label={t("tapToSpeak", lang)}
          className="mic-orb relative grid h-28 w-28 place-items-center rounded-full text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {rec && (
            <>
              <span className="mic-ring absolute inset-0 rounded-full bg-primary" />
              <span className="mic-ring absolute inset-0 rounded-full bg-primary [animation-delay:.8s]" />
            </>
          )}
          <span className="relative">
            {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : rec ? <Square className="h-9 w-9 fill-current" /> : <Mic className="h-11 w-11" />}
          </span>
        </button>

        <VoiceWaveSticker active={rec} />
        <p className="mt-4 text-base font-medium">{busy ? t("thinking", lang) : rec ? t("listening", lang) : t("tapToSpeak", lang)}</p>
        {rec && <p className="mt-1 font-mono text-sm text-marigold">0:{String(secs).padStart(2, "0")}</p>}
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="mt-6 flex w-full max-w-xl gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder", lang)}
            className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            disabled={busy || !text.trim()}
            className="sticker-pill inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t("ask", lang)}</span>
          </button>
        </form>

        <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          {QUICK[lang].map((q, i) => (
            <button
              key={q}
              onClick={() => {
                setText(q);
                ask(q);
              }}
              disabled={busy}
              className={`sticker-pill inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${
                i === 4
                  ? "border-marigold/40 bg-accent text-accent-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-primary-soft"
              }`}
            >
              <span aria-hidden="true">{CHIP_STICKERS[i] ?? "🌾"}</span>
              <span>{q}</span>
            </button>
          ))}
        </div>
      </section>

      {!res && !busy && <p className="text-center text-muted-foreground">{t("empty", lang)}</p>}

      {res && (
        <section className="card-soft space-y-4 p-5 sm:p-6">
          {usedVoice && transcript && (
            <div className="rounded-xl bg-muted px-4 py-3 text-sm">
              <span className="text-muted-foreground">{t("youSaid", lang)}: </span>“{transcript}”
            </div>
          )}
          {refused ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-4">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <ShieldAlert className="h-5 w-5" />
                {t("refused", lang)}
              </div>
              <p className="mt-2 text-[17px] leading-relaxed">{res.answer_text}</p>
              <a href="tel:18001801551" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 font-semibold text-destructive-foreground">
                <Phone className="h-4 w-4" />
                {t("callKcc", lang)}: 1800-180-1551
              </a>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🌾 {t("answer", lang)}</p>
              <p className="mt-1 text-[18px] leading-relaxed">{res.answer_text}</p>
            </div>
          )}
          {audioUrl && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft/60 p-3">
              <audio controls autoPlay={autoplay} src={audioUrl} className="h-10 flex-1 min-w-[240px]" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="accent-primary" />
                {t("autoplay", lang)}
              </label>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {!refused && (
                <Pill className="bg-primary-soft text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("verified", lang)}
                </Pill>
              )}
              {res.source_citation && (
                <Pill>
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("source", lang)}: {res.source_citation}
                </Pill>
              )}
              {res.intent && (
                <Pill>
                  <Target className="h-3.5 w-3.5" />
                  {t("intent", lang)}: {String(res.intent)}
                </Pill>
              )}
              {res.latency_seconds != null && (
                <Pill>
                  <Timer className="h-3.5 w-3.5" />
                  {t("latency", lang)}: {res.latency_seconds.toFixed(2)}s
                </Pill>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!feedback ? (
                <>
                  <span className="text-xs text-muted-foreground">{fbText[lang].ask}</span>
                  <button
                    onClick={() => setFeedback("up")}
                    aria-label="Helpful"
                    className="sticker-pill rounded-full border border-border bg-card p-1.5 text-primary hover:bg-primary-soft"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setFeedback("down")}
                    aria-label="Needs help"
                    className="sticker-pill rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="text-xs font-medium text-primary">
                  {feedback === "up" ? fbText[lang].thanksUp : fbText[lang].thanksDown}
                </span>
              )}
            </div>
          </div>
          <details className="group rounded-xl border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm text-muted-foreground">
              {t("trace", lang)} {res.engine ? `· ${res.engine}` : ""}
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <pre className="max-h-72 overflow-auto border-t border-border bg-muted px-4 py-3 text-xs">
              {JSON.stringify({ entities: res.entities, gate_decision: res.gate_decision, logs: res.logs }, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}
function Pill({ children, className = "bg-secondary text-secondary-foreground" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${className}`}>{children}</span>;
}
