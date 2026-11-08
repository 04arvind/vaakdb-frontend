const SUGGESTIONS = [
  { title: "Show my schemas", detail: "and how many tables each has" },
  { title: "Create a table main.courses", detail: "with id integer primary key and title text" },
  { title: "What columns does main.courses have?", detail: "types, keys and sample rows" },
  { title: "Attach a PDF or CSV", detail: "and say “store this as students in schema college”" },
];

export function SuggestedActions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.title}
          type="button"
          onClick={() => onSelect(s.title.startsWith("Attach") ? "" : `${s.title} ${s.detail}`)}
          disabled={s.title.startsWith("Attach")}
          className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-card"
        >
          <span className="block font-medium">{s.title}</span>
          <span className="block text-muted-foreground">{s.detail}</span>
        </button>
      ))}
    </div>
  );
}
