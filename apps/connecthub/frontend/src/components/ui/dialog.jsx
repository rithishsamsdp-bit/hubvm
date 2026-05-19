import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

const DialogContext = React.createContext({ width: undefined });

function Dialog({ width, ...props }) {
  const value = React.useMemo(() => ({ width }), [width]);
  return (
    <DialogContext.Provider value={value}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogContext.Provider>
  );
}

function DialogTrigger({ ...props }) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ children, ...props }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal" {...props}>
      {children}
    </DialogPrimitive.Portal>
  );
}

function DialogClose({ ...props }) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)]",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  width: propsWidth,
  closeOnOutsideClick = true,
  closeOnEsc = true,
  ...props
}) {
  const { width: contextWidth } = React.useContext(DialogContext);
  const width = propsWidth || contextWidth;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        asChild
        onPointerDownOutside={(e) => {
          if (!closeOnOutsideClick) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!closeOnEsc) e.preventDefault();
        }}
        {...props}
      >
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
          <div
            className={cn(
              "relative flex w-full flex-col rounded-xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] duration-300 outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-80 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)] border border-slate-100",
              className,
            )}
            style={{ 
              maxWidth: width || undefined,
              minWidth: width || undefined,
              width: width || undefined 
            }}
          >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-40 transition-all hover:opacity-100 hover:bg-slate-100 focus:outline-none disabled:pointer-events-none cursor-pointer">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-xl leading-none font-bold tracking-tight text-slate-900",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
