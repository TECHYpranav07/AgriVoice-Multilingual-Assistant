import type { Lang } from "@/lib/agri-i18n";

export function FarmerMascotSticker({ lang, interactiveTip }: { lang: Lang; interactiveTip?: string }) {
  const greeting: Record<Lang, string> = {
    hi: "नमस्ते किसान भाई! बोलकर अपना सवाल पूछें 🌾",
    mr: "राम राम शेतकरी मित्र! बोलून तुमचा प्रश्न विचारा 🌾",
    en: "Namaste Farmer Friend! Tap & speak your query 🌾",
  };
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft via-card to-accent px-4 py-2.5 shadow-sm">
      <div className="animate-float-gentle shrink-0" title="AgriVoice Kisan Mitra">
        <svg viewBox="0 0 80 80" className="h-14 w-14 drop-shadow-sm" aria-hidden="true">
          {/* Sky circle */}
          <circle cx="40" cy="40" r="36" fill="#DCFCE7" stroke="#166534" strokeWidth="2.5" />
          {/* Smiling sun corner */}
          <circle cx="62" cy="18" r="7" fill="#FBBF24" />
          {/* Turban / Pagdi */}
          <path d="M22 31 C22 17, 58 17, 58 31 Z" fill="#EA580C" />
          <path d="M20 31 Q40 24 60 31 Q58 36 40 34 Q22 36 20 31 Z" fill="#F97316" />
          <circle cx="40" cy="24" r="3.5" fill="#FDE047" />
          {/* Face */}
          <circle cx="40" cy="43" r="13" fill="#FDBA74" />
          {/* Eyes */}
          <circle cx="35" cy="41" r="2" fill="#1E293B" />
          <circle cx="45" cy="41" r="2" fill="#1E293B" />
          {/* Mustache & Smile */}
          <path d="M33 47 Q37 45 40 47 Q43 45 47 47" stroke="#451A03" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M35 49 Q40 53 45 49" stroke="#7C2D12" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Kurta shoulders */}
          <path d="M20 68 C22 57, 58 57, 60 68 Z" fill="#15803D" />
          {/* Wheat stalk held in hand */}
          <g className="animate-sway-crop">
            <line x1="63" y1="67" x2="67" y2="39" stroke="#CA8A04" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="64" cy="44" rx="2.5" ry="4" transform="rotate(-25 64 44)" fill="#EAB308" />
            <ellipse cx="69" cy="46" rx="2.5" ry="4" transform="rotate(25 69 46)" fill="#EAB308" />
            <ellipse cx="63" cy="51" rx="2.5" ry="4" transform="rotate(-25 63 51)" fill="#EAB308" />
            <ellipse cx="68" cy="53" rx="2.5" ry="4" transform="rotate(25 68 53)" fill="#EAB308" />
          </g>
        </svg>
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-primary">{interactiveTip ?? greeting[lang]}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 border border-border">🌱 ICAR IPM</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 border border-border">🚜 APMC Live</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 border border-border">⛅ Spray Check</span>
        </div>
      </div>
    </div>
  );
}

export function VoiceWaveSticker({ active }: { active: boolean }) {
  if (!active) return null;
  const delays = ["0ms", "120ms", "240ms", "80ms", "180ms", "40ms", "200ms"];
  return (
    <div className="mt-3 flex h-7 items-center justify-center gap-1" aria-hidden="true">
      {delays.map((d, idx) => (
        <span
          key={idx}
          style={{ animationDelay: d }}
          className="wave-bar inline-block h-6 w-1.5 rounded-full bg-primary"
        />
      ))}
    </div>
  );
}

export function AnimatedWeatherSticker({ rain, wind }: { rain: number; wind: number }) {
  const isRainy = rain > 0.5;
  const isWindy = wind > 15;
  return (
    <div className="shrink-0">
      <svg viewBox="0 0 80 80" className="h-16 w-16" aria-hidden="true">
        {!isRainy && (
          <g className="animate-spin-slow">
            <circle cx="40" cy="36" r="14" fill="#FBBF24" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="40"
                y1="14"
                x2="40"
                y2="8"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${deg} 40 36)`}
              />
            ))}
          </g>
        )}
        {(isRainy || isWindy) && (
          <g className="animate-float-gentle">
            <path
              d="M24 48 H56 A10 10 0 0 0 56 29 A14 14 0 0 0 29 26 A11 11 0 0 0 24 48 Z"
              fill="#CBD5E1"
              stroke="#64748B"
              strokeWidth="2"
            />
          </g>
        )}
        {isRainy && (
          <g stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
            <line x1="30" y1="54" x2="27" y2="64" />
            <line x1="41" y1="54" x2="38" y2="66" />
            <line x1="52" y1="54" x2="49" y2="64" />
          </g>
        )}
        {!isRainy && (
          <g className="animate-sway-crop">
            <path d="M40 72 Q40 58 50 54 Q46 66 40 72 Z" fill="#16A34A" />
            <path d="M40 72 Q40 60 30 56 Q34 66 40 72 Z" fill="#22C55E" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function TractorBannerSticker({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-marigold/30 bg-accent px-3.5 py-1 text-xs font-semibold text-accent-foreground">
      <span className="animate-tractor inline-block text-base" aria-hidden="true">
        🚜
      </span>
      <span>{label}</span>
    </div>
  );
}

export const CROP_STICKERS: Record<string, string> = {
  cotton: "☁️",
  soybean: "🫘",
  wheat: "🌾",
  onion: "🧅",
  gram: "🟡",
};
