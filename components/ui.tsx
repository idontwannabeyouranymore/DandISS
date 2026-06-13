import { Scissors } from "lucide-react";

export function Monogram({
  name,
  size = "h-12 w-12",
  text = "text-base",
}: {
  name: string;
  size?: string;
  text?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className={`${size} ${text} flex items-center justify-center rounded-full bg-neutral-900 font-semibold text-white shrink-0`}
    >
      {initials}
    </div>
  );
}

export function Photo({
  className = "",
  label,
  src,
  alt,
}: {
  className?: string;
  label?: boolean;
  src?: string | null;
  alt?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`relative overflow-hidden bg-neutral-800 ${className}`}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 14px)",
        }}
      />
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Scissors className="h-7 w-7 text-white/40" />
        </div>
      )}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
      {children}
    </span>
  );
}
