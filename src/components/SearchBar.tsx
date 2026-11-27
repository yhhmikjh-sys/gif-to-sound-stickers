import { useState } from "react";

export function SearchBar({ initial = "", placeholder, onSearch }: { initial?: string; placeholder: string; onSearch: (q: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(v.trim());
      }}
      className="sticky top-3 z-10 mx-auto mt-6 flex max-w-xl gap-2"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-full border-2 border-foreground bg-card px-5 py-3 text-foreground outline-none focus:ring-4 focus:ring-primary/40"
      />
      <button className="rounded-full border-2 border-foreground bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-pop transition active:translate-y-0.5">
        Search
      </button>
    </form>
  );
}
