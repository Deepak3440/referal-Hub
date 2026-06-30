import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Building2, Briefcase, Check, ChevronDown, Loader2, MapPin, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { searchCompanies, searchLocations, searchRoles } from "@/lib/career-api";
import { cn } from "@/lib/utils";

export type CareerKind = "company" | "role" | "location";

type Props = {
  kind: CareerKind;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

const CONFIG: Record<
  CareerKind,
  { icon: typeof Building2; search: typeof searchCompanies; emptyHint: string; customHint: string }
> = {
  company: {
    icon: Building2,
    search: searchCompanies,
    emptyHint: "Popular companies",
    customHint: "Use",
  },
  role: {
    icon: Briefcase,
    search: searchRoles,
    emptyHint: "Popular roles",
    customHint: "Use",
  },
  location: {
    icon: MapPin,
    search: searchLocations,
    emptyHint: "Popular locations",
    customHint: "Use",
  },
};

const DEFAULT_PLACEHOLDERS: Record<CareerKind, string> = {
  company: "Search or type company name",
  role: "Search or type job title",
  location: "Search or type location",
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

export function SearchableCareerField({
  kind,
  label,
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  required = false,
}: Props) {
  const inputId = useId();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const userIntentRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebouncedValue(inputValue, 200);
  const { icon: Icon, search, emptyHint, customHint } = CONFIG[kind];

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
    if (disabled) return;
    userIntentRef.current = true;
    setOpen(true);
  }, [disabled]);

  const closeList = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

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
    closeList();
  }

  function commitCustom() {
    if (!trimmed) return;
    selectOption(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

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

  return (
    <div className={cn("relative space-y-1.5", className)} ref={wrapRef}>
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2",
            open ? "text-primary" : "text-muted-foreground",
          )}
        />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={inputValue}
          placeholder={placeholder ?? DEFAULT_PLACEHOLDERS[kind]}
          disabled={disabled}
          required={required}
          className={cn(
            "h-11 bg-background pl-9 pr-10 text-sm shadow-sm",
            open && "rounded-b-none border-b-transparent border-primary/50 ring-2 ring-primary/15 ring-b-0",
          )}
          onPointerDown={() => {
            userIntentRef.current = true;
          }}
          onChange={(e) => {
            const next = e.target.value;
            setInputValue(next);
            onChange(next);
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
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
          onPointerDown={(e) => {
            e.preventDefault();
            userIntentRef.current = true;
            setOpen((prev) => !prev);
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          )}
        </button>

        {open && !disabled && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[200] -mt-px overflow-hidden rounded-b-xl border border-t-0 border-primary/50 bg-popover text-popover-foreground shadow-lg ring-2 ring-primary/15 ring-t-0"
          >
            <div className="border-b bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {trimmed ? `Matches for “${trimmed}”` : emptyHint}
            </div>

            <ul className="max-h-52 overflow-y-auto overscroll-contain py-0.5">
              {loading && items.length === 0 && (
                <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </li>
              )}

              {!loading && items.length === 0 && !showCustom && (
                <li className="px-3 py-5 text-center text-sm text-muted-foreground">
                  Type to search or enter your own
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
                      {customHint} <span className="font-medium">“{trimmed}”</span>
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
