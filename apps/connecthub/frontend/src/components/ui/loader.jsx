import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function Loader({ className, size = "medium", ...props }) {
  const sizeClasses = {
    small: "h-5 w-5",
    medium: "h-10 w-10",
    large: "h-16 w-16",
  };

  const loaderSize = sizeClasses[size] || size;

  return (
    <div
      className={cn("flex items-center justify-center p-4", className)}
      {...props}
    >
      <Loader2
        className={cn("animate-spin text-primary opacity-80", loaderSize)}
      />
    </div>
  );
}

export { Loader };
