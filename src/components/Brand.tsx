import isotipo from "@/assets/isotipo.png.asset.json";

/** Sello institucional de la plataforma (secundario, discreto). */
export function PlatformSeal({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2 opacity-90">
      <img
        src={isotipo.url}
        alt="Mi Agenda Zen"
        className={`${compact ? "h-6 w-6" : "h-7 w-7"} shrink-0 object-contain`}
        width={56}
        height={56}
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] font-semibold tracking-tight text-foreground">
          Mi Agenda Zen
        </p>
        <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground">
          By MicroFix Cloud
        </p>
      </div>
    </div>
  );
}

/** Línea institucional en una sola línea (pies de página públicos). */
export function PlatformFooter() {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <img src={isotipo.url} alt="" aria-hidden className="h-5 w-5 object-contain" />
      <p className="text-xs font-medium text-muted-foreground">
        Mi Agenda Zen · By MicroFix Cloud
      </p>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Marca del profesional: protagonista en cabeceras. */
export function BusinessBrand({
  name,
  logoUrl,
  size = "md",
  center = false,
}: {
  name: string;
  logoUrl?: string | null;
  size?: "md" | "lg";
  center?: boolean;
}) {
  const logoH = size === "lg" ? "h-16" : "h-10";
  const titleCls = size === "lg" ? "text-xl md:text-2xl" : "text-base md:text-lg";

  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${center ? "flex-col justify-center text-center" : ""}`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={`${logoH} w-auto shrink-0 object-contain`}
        />
      ) : (
        <div
          aria-hidden
          className={`${size === "lg" ? "h-16 w-16 text-lg" : "h-10 w-10 text-sm"} flex shrink-0 items-center justify-center rounded-full bg-gold-soft font-bold tracking-wide text-gold`}
        >
          {initials(name || "MZ")}
        </div>
      )}
      <p className={`${titleCls} min-w-0 truncate font-bold tracking-tight text-foreground`}>
        {name}
      </p>
    </div>
  );
}

/** Compatibilidad: marca de plataforma completa. */
export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const title = size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={isotipo.url}
        alt="Mi Agenda Zen"
        className={`${icon} shrink-0 object-contain`}
        width={56}
        height={56}
      />
      <div className="min-w-0 leading-tight">
        <p className={`${title} truncate font-bold tracking-tight text-foreground`}>
          Mi Agenda Zen
        </p>
        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
          By MicroFix Cloud
        </p>
      </div>
    </div>
  );
}
