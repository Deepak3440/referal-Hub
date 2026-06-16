import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { filterSkillSuggestions, joinSkills, parseSkills } from "@/lib/skill-suggestions";
import { cn } from "@/lib/utils";

type SkillsInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function SkillsInput({
  value,
  onChange,
  placeholder = "Type a skill — pick from suggestions or press Enter",
  disabled,
  id,
  className,
}: SkillsInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const skills = parseSkills(value);
  const suggestions = filterSkillSuggestions(query, skills);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const addSkill = (raw: string) => {
    const next = raw.trim();
    if (!next) return;

    const exists = skills.some((s) => s.toLowerCase() === next.toLowerCase());
    if (exists) {
      setQuery("");
      setOpen(false);
      return;
    }

    onChange(joinSkills([...skills, next]));
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeSkill = (index: number) => {
    onChange(joinSkills(skills.filter((_, i) => i !== index)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && suggestions[activeIndex]) {
        addSkill(suggestions[activeIndex]);
      } else {
        addSkill(query);
      }
      return;
    }

    if (event.key === "," || event.key === "Tab") {
      if (query.trim()) {
        event.preventDefault();
        addSkill(query);
      }
      return;
    }

    if (event.key === "Backspace" && !query && skills.length > 0) {
      removeSkill(skills.length - 1);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
          disabled && "opacity-50 pointer-events-none",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {skills.map((skill, index) => (
          <Badge
            key={`${skill}-${index}`}
            variant="secondary"
            className="gap-1 pr-1 text-xs font-medium"
          >
            {skill}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                removeSkill(index);
              }}
              aria-label={`Remove ${skill}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Input
          ref={inputRef}
          id={id}
          value={query}
          disabled={disabled}
          placeholder={skills.length === 0 ? placeholder : "Add another skill..."}
          className="flex-1 min-w-[140px] border-0 shadow-none focus-visible:ring-0 h-8 px-1"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((skill, index) => (
            <li key={skill} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                  index === activeIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addSkill(skill)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {skill}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Start typing — suggestions appear like Naukri / LinkedIn. Press Enter or pick one.
      </p>
    </div>
  );
}
