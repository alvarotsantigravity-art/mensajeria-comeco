"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookUser, LoaderCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { findRecipients, type RecipientOption } from "@/app/(app)/libreta/actions";

/**
 * Campo "Destinatario" (§5.2): autocompletado sobre la libreta compartida,
 * tolerante a tildes y errores. Vacío → favoritos y recientes.
 */
export function RecipientCombobox({
  onSelect,
  disabled,
  label = "Destinatario de la libreta",
}: {
  onSelect: (r: RecipientOption) => void;
  disabled?: boolean;
  label?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RecipientOption[]>([]);
  const [active, setActive] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    if (!open) return;
    const current = ++request.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await findRecipients(query);
        if (current === request.current) {
          setOptions(result);
          setActive(0);
        }
      } finally {
        if (current === request.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  function choose(option: RecipientOption) {
    onSelect(option);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <BookUser className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder="Busca por empresa, ciudad o contacto…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open && options[active]) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-11 w-full rounded-md border border-line bg-surface pr-10 pl-10 outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-60"
        />
        {loading ? (
          <LoaderCircle className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden />
        ) : null}
      </div>

      {open && (options.length > 0 || (!loading && query.trim())) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">Nada en la libreta con «{query.trim()}».</li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("grid cursor-pointer gap-0.5 rounded-md px-3 py-2", i === active && "bg-surface-2")}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {o.is_favorite ? <Star className="size-3.5 fill-kraft text-kraft" aria-label="Favorito" /> : null}
                  {o.company_name}
                </span>
                <span className="text-sm text-muted">
                  {[o.address, [o.postal_code, o.city].filter(Boolean).join(" "), o.contact_person].filter(Boolean).join(" · ") ||
                    "Sin dirección"}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
