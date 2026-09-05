import isotipo from "@/assets/isotipo.png.asset.json";

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
