import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pure Tailwind Drawer — no vaul, no Radix.
 * Supports: direction ("left"|"right"|"top"|"bottom"), showClose (true|false), showBackdrop (true|false)
 *
 * Usage:
 *   <Drawer open={open} onOpenChange={setOpen} direction="left" showClose={false}>
 *     <DrawerContent>
 *       <DrawerHeader> ... </DrawerHeader>
 *       ...
 *     </DrawerContent>
 *   </Drawer>
 */

const DrawerContext = React.createContext({
  direction: "bottom",
  showClose: true,
  close: () => {},
});

function Drawer({
  open = false,
  onOpenChange,
  direction = "bottom",
  showClose = true,
  showBackdrop = true,
  children,
}) {
  const close = () => onOpenChange?.(false);

  return (
    <DrawerContext.Provider value={{ direction, showClose, close }}>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={cn(
            "fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm",
            "transition-opacity duration-300 ease-in-out",
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          onClick={close}
        />
      )}
      {/* Panel wrapper — passes open state via data attr */}
      <DrawerContext.Provider value={{ direction, showClose, close, open }}>
        {children}
      </DrawerContext.Provider>
    </DrawerContext.Provider>
  );
}
Drawer.displayName = "Drawer";

// Position + size classes per direction
const directionConfig = {
  left: {
    position: "top-0 left-0 bottom-0 w-80",
    rounded: "rounded-xl",
    border: "border-r",
    hiddenTransform: "-translate-x-full",
    visibleTransform: "translate-x-0",
  },
  right: {
    position: "top-0 right-0 bottom-0 w-80",
    rounded: "rounded-xl",
    border: "border-l",
    hiddenTransform: "translate-x-full",
    visibleTransform: "translate-x-0",
  },
  top: {
    position: "top-0 left-0 right-0 max-h-[80vh] h-auto",
    rounded: "rounded-xl",
    border: "border-b",
    hiddenTransform: "-translate-y-full",
    visibleTransform: "translate-y-0",
  },
  bottom: {
    position: "bottom-0 left-0 right-0 max-h-[80vh] h-auto",
    rounded: "rounded-xl",
    border: "border-t",
    hiddenTransform: "translate-y-full",
    visibleTransform: "translate-y-0",
  },
};

function DrawerContent({ className, children, ...props }) {
  const { direction, showClose, close, open } = React.useContext(DrawerContext);
  const config = directionConfig[direction] ?? directionConfig.bottom;

  return (
    <div
      className={cn(
        "fixed z-[1001] flex flex-col bg-background shadow-2xl overflow-hidden",
        config.position,
        config.rounded,
        config.border,
        "transition-transform duration-300 ease-in-out",
        open ? config.visibleTransform : config.hiddenTransform,
        className,
      )}
      {...props}
    >
      {showClose && (
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}
DrawerContent.displayName = "DrawerContent";

// Bottom handle (only for bottom drawers)
function DrawerHandle() {
  const { direction } = React.useContext(DrawerContext);
  if (direction !== "bottom") return null;
  return (
    <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20 shrink-0" />
  );
}

function DrawerHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center border-b px-4 py-4 shrink-0", className)}
      {...props}
    />
  );
}
DrawerHeader.displayName = "DrawerHeader";

function DrawerTitle({ className, ...props }) {
  return (
    <h2
      className={cn(
        "text-lg font-bold leading-none text-foreground",
        className,
      )}
      {...props}
    />
  );
}
DrawerTitle.displayName = "DrawerTitle";

function DrawerDescription({ className, ...props }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
DrawerDescription.displayName = "DrawerDescription";

function DrawerFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "mt-auto border-t px-4 py-3 shrink-0 flex flex-col gap-2",
        className,
      )}
      {...props}
    />
  );
}
DrawerFooter.displayName = "DrawerFooter";

// Trigger — just a wrapper, open state managed externally
function DrawerTrigger({ onClick, children, ...props }) {
  return (
    <span onClick={onClick} {...props}>
      {children}
    </span>
  );
}
DrawerTrigger.displayName = "DrawerTrigger";

function DrawerClose({ children, ...props }) {
  const { close } = React.useContext(DrawerContext);
  return (
    <span onClick={close} {...props}>
      {children}
    </span>
  );
}
DrawerClose.displayName = "DrawerClose";

export {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
};
