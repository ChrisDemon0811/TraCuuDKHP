import type { LucideIcon } from "lucide-react";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PageHeading({ eyebrow, title, description, icon: Icon }: PageHeadingProps) {
  return (
    <section className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-vaa-border bg-white px-3 py-1 text-sm font-semibold text-vaa-muted shadow-sm">
          <Icon size={16} className="text-vaa-gold" />
          {eyebrow}
        </div>
        <h1 className="text-3xl font-bold leading-tight text-vaa-text sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-vaa-muted">{description}</p>
      </div>
    </section>
  );
}
