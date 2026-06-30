import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Check, ChevronDown, GraduationCap, Loader2, Plus, X } from "lucide-react";
import { searchColleges, searchCompanies } from "@/lib/career-api";
import { cn } from "@/lib/utils";

export type CareerFilterKind = "company" | "college";

type Props = {
  kind: CareerFilterKind;
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const CONFIG: Record<
  CareerFilterKind,
  { icon: LucideIcon; search: typeof searchCompanies }
> = {
  company: {
    icon: Building2,
    search: searchCompanies,
  },
  college: {
    icon: GraduationCap,
    search: searchColleges,
  },
};

const DEFAULT_PLACEHOLDERS: Record<CareerFilterKind, string> = {
  company: "Search company…",
  college: "Search college…",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

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

export function SearchableCareerFilter({
  kind,
  label,
  icon,
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const userIntentRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebouncedValue(inputValue, 200);
  const { icon: DefaultIcon, search } = CONFIG[kind];
  const Icon = icon ?? DefaultIcon;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const loadSuggestions = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const result = await search(query, 10);
        setItems(result.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  const openList = useCallback(() => {
    userIntentRef.current = true;
    setOpen(true);
    setInputValue((prev) => (value ? prev : ""));
  }, [value]);

  const closeList = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    void loadSuggestions(debouncedQuery);
  }, [open, debouncedQuery, loadSuggestions]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      closeList();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeList]);

  const trimmed = inputValue.trim();
  const exactMatch = items.some((item) => item.toLowerCase() === trimmed.toLowerCase());
  const showCustom = trimmed.length > 0 && !exactMatch;
  const optionCount = items.length + (showCustom ? 1 : 0);

  function selectOption(next: string) {
    setInputValue(next);
    onChange(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function commitCustom() {
    if (!trimmed) return;
    selectOption(trimmed);
  }

  function clearValue(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setInputValue("");
    onChange("");
    closeList();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openList();
      return;
    }

    if (!open) {
      if (e.key === "Enter" && trimmed) commitCustom();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(optionCount, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        selectOption(items[activeIndex]!);
      } else {
        commitCustom();
      }
    } else if (e.key === "Escape") {
      closeList();
    }
  }

  const displayValue = open ? inputValue : value;

  return (
    <div className={cn("relative space-y-1", className)} ref={wrapRef}>
      <div
        className={cn(
          "relative min-h-[52px] rounded-xl border border-border bg-background px-3 py-2 shadow-sm",
          open && "z-[100] rounded-b-none border-b-transparent border-primary/50 ring-2 ring-primary/15 ring-b-0",
        )}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>

        <div className="relative mt-0.5 flex items-center">
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={displayValue}
            placeholder={placeholder ?? DEFAULT_PLACEHOLDERS[kind]}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground",
              value && !open && "pr-6",
            )}
            onPointerDown={() => {
              userIntentRef.current = true;
            }}
            onChange={(e) => {
              setInputValue(e.target.value);
              openList();
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (userIntentRef.current) openList();
            }}
            onBlur={() => {
              if (trimmed && trimmed !== value) {
                onChange(trimmed);
              }
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
              if (!open && !value) setInputValue("");
              setOpen((prev) => !prev);
            }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            )}
          </button>
        </div>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[200] -mt-px overflow-hidden rounded-b-xl border border-t-0 border-primary/50 bg-popover text-popover-foreground shadow-lg ring-2 ring-primary/15 ring-t-0"
          >
            {trimmed ? (
              <div className="border-b bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Matches for “{trimmed}”
              </div>
            ) : null}

            <ul className="max-h-52 overflow-y-auto overscroll-contain py-0.5">
              {loading && items.length === 0 && (
                <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </li>
              )}

              {!loading && items.length === 0 && !showCustom && (
                <li className="px-3 py-5 text-center text-sm text-muted-foreground">
                  Type to search
                </li>
              )}

              {items.map((item, index) => {
                const selected = value === item;
                const active = activeIndex === index;
                return (
                  <li key={item} role="option" aria-selected={selected || active}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                        active ? "bg-primary/10" : "hover:bg-muted/80",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(item)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{highlightMatch(item, trimmed)}</span>
                      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })}

              {showCustom && (
                <li role="option" aria-selected={activeIndex === items.length}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm",
                      activeIndex === items.length ? "bg-primary/10" : "hover:bg-muted/80",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(items.length)}
                    onClick={commitCustom}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-primary">
                      Use <span className="font-medium">“{trimmed}”</span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
