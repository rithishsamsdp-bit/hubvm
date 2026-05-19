import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "./loader";

const SelectRoot = SelectPrimitive.Root;

const Select = React.forwardRef(
  (
    {
      children,
      options,
      placeholder,
      showSearch,
      searchValue,
      onSearchChange,
      allowClear,
      onClear,
      triggerClassName,
      contentClassName,
      ...props
    },
    ref,
  ) => {
    const [internalSearch, setInternalSearch] = React.useState("");

    if (options) {
      const effectiveSearchValue =
        searchValue !== undefined ? searchValue : internalSearch;
      const effectiveOnSearchChange = onSearchChange || setInternalSearch;

      const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(effectiveSearchValue.toLowerCase()),
      );

      return (
        <SelectRoot {...props}>
          <SelectTrigger
            className={triggerClassName}
            allowClear={allowClear}
            onClear={onClear}
            value={props.value}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            showSearch={showSearch}
            searchValue={effectiveSearchValue}
            onSearchChange={effectiveOnSearchChange}
            className={contentClassName}
          >
            {props.isLoading ? (
              <div className="flex items-center justify-center py-6 text-slate-400 text-[11px]">
                <Loader className="w-3 h-3 mr-2 animate-spin" />
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-slate-400 text-[11px]">
                {props.emptyMessage || "No options found"}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {props.optionRender ? props.optionRender(opt) : opt.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </SelectRoot>
      );
    }
    return <SelectRoot {...props}>{children}</SelectRoot>;
  },
);
Select.displayName = "Select";

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(
  ({ className, children, allowClear, onClear, value, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm transition-all shadow-sm focus:outline-none data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 dark:border-slate-800 dark:bg-slate-950 dark:data-[state=open]:ring-slate-300",
        !value && "text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {allowClear && value && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear?.();
            }}
            className="cursor-pointer rounded-md opacity-50 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          >
            <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
          </button>
        )}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 text-slate-400 opacity-70" />
        </SelectPrimitive.Icon>
      </div>
    </SelectPrimitive.Trigger>
  ),
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  ),
);
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  ),
);
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef(
  (
    {
      className,
      children,
      position = "popper",
      showSearch,
      searchValue,
      onSearchChange,
      ...props
    },
    ref,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[100000] max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=fade-in]:zoom-in-95 data-[state=fade-out]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        {showSearch && (
          <div className="flex items-center border-b border-slate-100 px-3 py-2 sticky top-0 bg-white z-10 dark:bg-slate-950 dark:border-slate-800">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                // Prevent space from closing the select
                if (e.key === " ") {
                  e.stopPropagation();
                }
              }}
            />
          </div>
        )}
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-content-available-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-primary/10 focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-slate-800 dark:focus:text-slate-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-slate-800", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
