const SUGGESTIONS = [
  { title: "Top 5 best-selling products", detail: "by units sold" },
  { title: "Monthly revenue", detail: "for the last 6 months" },
  { title: "Which cities have the most customers?", detail: "top 5" },
  { title: "Breakdown of orders by status", detail: "with percentages" },
];

export function SuggestedActions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.title}
          type="button"
          onClick={() => onSelect(`${s.title} ${s.detail}`)}
          className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
        >
          <span className="block font-medium">{s.title}</span>
          <span className="block text-muted-foreground">{s.detail}</span>
        </button>
      ))}
    </div>
  );
}
