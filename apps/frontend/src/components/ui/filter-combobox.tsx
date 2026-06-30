import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterComboboxOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: FilterComboboxOption[];
  placeholder?: string;
  className?: string;
};

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Inline filter combobox — same shell as company/college search filters (no Radix portal). */
export function FilterCombobox({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = "Any",
  className,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const userIntentRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = options.filter((o) => !q || o.label.toLowerCase().includes(q));
    return [{ value: "", label: "Any" }, ...pool];
  }, [options, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openList() {
    userIntentRef.current = true;
    setOpen(true);
  }

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function clearValue(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openList();
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectOption(filtered[activeIndex]!.value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const inputDisplay = open ? query : selected?.label ?? "";

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <div
        className={cn(
          "relative min-h-[52px] rounded-xl border border-border bg-background px-3 py-2 shadow-sm",
          open && "z-[100] rounded-b-none border-b-transparent border-primary/50 ring-2 ring-primary/15 ring-b-0",
        )}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {Icon ? <Icon className="h-3 w-3 shrink-0" /> : null}
          {label}
        </span>

        <div className="relative mt-0.5 flex items-center">
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={inputDisplay}
            placeholder={placeholder}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground",
              value && !open && "pr-6",
            )}
            onPointerDown={() => {
              userIntentRef.current = true;
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              openList();
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (userIntentRef.current) openList();
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />

          {value && !open ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Clear ${label}`}
              className="absolute right-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearValue}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
            onPointerDown={(e) => {
              e.preventDefault();
              userIntentRef.current = true;
              setOpen((prev) => !prev);
            }}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[200] -mt-px overflow-hidden rounded-b-xl border border-t-0 border-primary/50 bg-popover text-popover-foreground shadow-lg ring-2 ring-primary/15 ring-t-0"
          >
            {query.trim() ? (
              <div className="border-b bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Matches for “{query.trim()}”
              </div>
            ) : null}

            <ul className="max-h-52 overflow-y-auto overscroll-contain py-0.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-5 text-center text-sm text-muted-foreground">No matches</li>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = value === option.value;
                  const active = activeIndex === index;
                  return (
                    <li key={option.value || "__all__"} role="option" aria-selected={isSelected || active}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                          active ? "bg-primary/10" : "hover:bg-muted/80",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectOption(option.value)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {highlightMatch(option.label, query)}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
