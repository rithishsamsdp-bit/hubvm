import * as React from "react";
import ReactDOM from "react-dom";
import { X, ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * MultiSelect component with smart positioning (flips above/below based on space).
 * Uses smart portal target: portals to closest Dialog content (to stay inside focus scope)
 * or to document.body when not inside a Dialog.
 */
const MultiSelect = React.forwardRef(
  (
    {
      options = [],
      value = [],
      onValueChange,
      placeholder = "Select members...",
      className,
      disabled = false,
      maxCount = 3,
      showSearch = true,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [dropUp, setDropUp] = React.useState(false);
    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const [dropdownPos, setDropdownPos] = React.useState({
      top: 0,
      left: 0,
      width: 0,
      placement: "bottom",
    });

    // Find the best portal target: Dialog content (stays in focus scope) or body
    const getPortalTarget = React.useCallback(() => {
      if (!containerRef.current) return document.body;
      const dialogContent = containerRef.current.closest(
        '[data-slot="dialog-content"]',
      );
      return dialogContent || document.body;
    }, []);

    const updateDropdownPosition = React.useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const portalTarget = getPortalTarget();
      const dropdownHeight = 300; // estimated max height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const placement =
        spaceBelow < dropdownHeight && spaceAbove > spaceBelow
          ? "top"
          : "bottom";

      // If portal target is Dialog content, calculate position relative to it
      let offsetTop = 0;
      let offsetLeft = 0;
      if (portalTarget !== document.body) {
        const portalRect = portalTarget.getBoundingClientRect();
        offsetTop = portalRect.top + portalTarget.scrollTop;
        offsetLeft = portalRect.left + portalTarget.scrollLeft;
      }

      setDropdownPos({
        top:
          placement === "bottom"
            ? rect.bottom + (portalTarget === document.body ? window.scrollY : 0) - offsetTop
            : rect.top + (portalTarget === document.body ? window.scrollY : 0) - offsetTop,
        left: rect.left + (portalTarget === document.body ? window.scrollX : 0) - offsetLeft,
        width: rect.width,
        placement,
      });
      setDropUp(placement === "top");
    }, [getPortalTarget]);

    React.useEffect(() => {
      if (open) {
        updateDropdownPosition();
        const handleUpdate = () => updateDropdownPosition();
        window.addEventListener("scroll", handleUpdate, true);
        window.addEventListener("resize", handleUpdate);

        // Focus search input
        if (inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }

        return () => {
          window.removeEventListener("scroll", handleUpdate, true);
          window.removeEventListener("resize", handleUpdate);
        };
      }
    }, [open, updateDropdownPosition]);

    const handleUnselect = (itemValue) => {
      onValueChange(value.filter((v) => v !== itemValue));
    };

    const handleSelect = (itemValue) => {
      if (value.includes(itemValue)) {
        onValueChange(value.filter((v) => v !== itemValue));
      } else {
        onValueChange([...value, itemValue]);
      }
    };

    const handleClear = (e) => {
      e.stopPropagation();
      onValueChange([]);
    };

    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );

    const toggleOpen = () => {
      if (!disabled) {
        setOpen(!open);
      }
    };

    // Close on click outside — uses pointerdown + capture to fire before Radix Select
    React.useEffect(() => {
      const handleClickOutside = (event) => {
        const clickedInsideTrigger =
          containerRef.current && containerRef.current.contains(event.target);
        const clickedInsideDropdown =
          dropdownRef.current && dropdownRef.current.contains(event.target);
        if (!clickedInsideTrigger && !clickedInsideDropdown) {
          setOpen(false);
        }
      };
      document.addEventListener("pointerdown", handleClickOutside, true);
      return () =>
        document.removeEventListener("pointerdown", handleClickOutside, true);
    }, []);

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", className)}
        {...props}
      >
        <div
          onClick={toggleOpen}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm transition-all shadow-sm focus-within:outline-none focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:focus-within:ring-slate-300",
            open && "border-primary ring-4 ring-primary/10",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-hidden text-left">
            {value.length > 0 ? (
              <>
                {value.slice(0, maxCount).map((val) => (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 py-0 h-6 text-[10px] font-semibold bg-slate-100 text-slate-900 border-none shrink-0"
                  >
                    <span className="truncate max-w-[80px]">
                      {options.find((opt) => opt.value === val)?.label || val}
                    </span>
                    <div
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnselect(val);
                      }}
                      className="rounded-full outline-none hover:bg-slate-200 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </div>
                  </Badge>
                ))}
                {value.length > maxCount && (
                  <Badge
                    variant="secondary"
                    className="h-6 text-[10px] font-semibold bg-slate-100 text-slate-900 border-none shrink-0"
                  >
                    +{value.length - maxCount} more
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-slate-500 truncate">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {value.length > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
                className="rounded-md opacity-50 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
              </div>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
        </div>

        {open &&
          ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              className={cn(
                "multi-select-dropdown pointer-events-auto absolute z-[99999] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-lg animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
              )}
              style={{
                top: dropUp ? dropdownPos.top : dropdownPos.top + 4,
                left: dropdownPos.left,
                width: dropdownPos.width,
                transform: dropUp ? "translateY(-100%)" : "translateY(0)",
                marginTop: dropUp ? "-4px" : "0",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {showSearch && (
                <div className="flex items-center border-b border-slate-100 px-3 py-2 sticky top-0 bg-white z-10">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    ref={inputRef}
                    className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      // Prevent Dialog/parent from capturing key events
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              )}
              <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-500">
                    No results found.
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = value.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option.value);
                        }}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-[11px] xl:text-xs transition-colors hover:bg-primary/5 hover:text-primary",
                          isSelected && "bg-primary/10 text-primary font-bold",
                        )}
                      >
                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </span>
                        {option.label}
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            getPortalTarget(),
          )}
      </div>
    );
  },
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
