import { useEffect, useState } from "react";
import { Thermometer, Droplets, CloudRain, Wind, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { t, type Lang } from "@/lib/agri-i18n";
import { COMMODITIES, CROP_NAMES, LOCATIONS, MANDIS, type MandiRow } from "@/lib/agri-data";
import { getMandi, getWeather, sprayUnsafe, type Weather } from "@/lib/agri-api";
import { AnimatedWeatherSticker, CROP_STICKERS, TractorBannerSticker } from "@/components/agri/FarmStickers";

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="flex-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-base">
        {options.map((o) => (
          <option key={o} value={o}>
            {cap(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MandiWeatherTab({ lang, api, online }: { lang: Lang; api: string; online: boolean }) {
  const [crop, setCrop] = useState("cotton");
  const [mandi, setMandi] = useState("nagpur");
  const [m, setM] = useState<{ selected: MandiRow; all_commodities: MandiRow[] } | null>(null);
  const [loc, setLoc] = useState("nagpur");
  const [w, setW] = useState<Weather | null>(null);
  const [wErr, setWErr] = useState(false);

  useEffect(() => {
    getMandi(api, crop, mandi, online).then(setM);
  }, [api, crop, mandi, online]);
  useEffect(() => {
    setW(null);
    setWErr(false);
    getWeather(api, loc, online)
      .then(setW)
      .catch(() => setWErr(true));
  }, [api, loc, online]);

  const unsafe = w ? sprayUnsafe(w) : false;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-primary">🏛️ {t("mandi", lang)}</h2>
          <TractorBannerSticker label="APMC Feed" />
        </div>
        <div className="mt-4 flex gap-3">
          <Select label={t("commodity", lang)} value={crop} onChange={setCrop} options={COMMODITIES} />
          <Select label={t("market", lang)} value={mandi} onChange={setMandi} options={MANDIS} />
        </div>
        {m ? (
          <>
            <div className="mt-5 rounded-2xl bg-primary-soft p-5">
              <p className="text-sm text-muted-foreground">
                {CROP_STICKERS[crop] ?? "🌱"} {CROP_NAMES[crop]?.[lang]} · {cap(mandi)} · {t("modal", lang)}
              </p>
              <p className="mt-1 font-display text-4xl font-semibold text-primary">
                {inr(m.selected.modal_price)} <span className="text-lg font-normal text-muted-foreground">/ Qtl</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-card px-3 py-1">
                  {t("min", lang)} {inr(m.selected.min_price)}
                </span>
                <span className="rounded-full bg-card px-3 py-1">
                  {t("max", lang)} {inr(m.selected.max_price)}
                </span>
                {m.selected.data_as_of && (
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground">As of {m.selected.data_as_of}</span>
                )}
              </div>
            </div>
            <p className="mt-5 text-sm font-medium text-muted-foreground">
              {t("allCrops", lang)} · {cap(mandi)}
            </p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 font-medium">{t("commodity", lang)}</th>
                  <th className="font-medium">{t("min", lang)}</th>
                  <th className="font-medium">{t("max", lang)}</th>
                  <th className="text-right font-medium">{t("modal", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {m.all_commodities.map((r) => {
                  const key = r.commodity_key ?? r.commodity;
                  return (
                    <tr
                      key={r.commodity}
                      onClick={() => COMMODITIES.includes(key as (typeof COMMODITIES)[number]) && setCrop(key)}
                      className={`cursor-pointer border-t border-border transition-colors hover:bg-primary-soft/50 ${
                        key === crop ? "font-semibold text-primary bg-primary-soft/30" : ""
                      }`}
                    >
                      <td className="py-2.5">
                        <span className="mr-1.5" aria-hidden="true">
                          {CROP_STICKERS[key] ?? "🌾"}
                        </span>
                        {CROP_NAMES[key]?.[lang] ?? r.commodity}
                      </td>
                      <td>{inr(r.min_price)}</td>
                      <td>{inr(r.max_price)}</td>
                      <td className="text-right">{inr(r.modal_price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </section>

      <section className="card-soft p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-primary">⛅ {t("weather", lang)}</h2>
          {w && <AnimatedWeatherSticker rain={w.rain_mm} wind={w.wind_speed_kmh} />}
        </div>
        <div className="mt-2 flex">
          <Select label={t("location", lang)} value={loc} onChange={setLoc} options={Object.keys(LOCATIONS)} />
        </div>
        {w ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Tile icon={<Thermometer />} label={t("temp", lang)} value={`${w.temperature_c.toFixed(1)}°C`} />
              <Tile icon={<Droplets />} label={t("humidity", lang)} value={`${Math.round(w.humidity_percent)}%`} />
              <Tile icon={<CloudRain />} label={t("rain", lang)} value={`${w.rain_mm} mm`} />
              <Tile icon={<Wind />} label={t("wind", lang)} value={`${w.wind_speed_kmh.toFixed(1)} km/h`} />
            </div>
            <div className={`mt-4 flex gap-3 rounded-2xl border p-4 ${unsafe ? "border-marigold/40 bg-accent text-accent-foreground" : "border-primary/20 bg-primary-soft text-primary"}`}>
              {unsafe ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <div>
                <p className="font-semibold">{t(unsafe ? "sprayWarn" : "spraySafe", lang)}</p>
                {w.spray_advisory && <p className="mt-1 text-sm opacity-90">{w.spray_advisory}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {w.source} {w.data_as_of ? `· ${w.data_as_of}` : ""}
            </p>
          </>
        ) : wErr ? (
          <p className="mt-8 text-center text-sm text-destructive">Weather unavailable</p>
        ) : (
          <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </section>
    </div>
  );
}
function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="sticker-pill rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-marigold">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}
