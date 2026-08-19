"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectContextValue {
  value: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemsMap: Map<string, React.ReactNode>;
  registerItem: (value: string, label: React.ReactNode) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  disabled,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [itemsMap, setItemsMap] = React.useState<Map<string, React.ReactNode>>(() => new Map());

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  const registerItem = React.useCallback((itemValue: string, label: React.ReactNode) => {
    setItemsMap((prev) => {
      if (prev.get(itemValue) === label) return prev;
      const next = new Map(prev);
      next.set(itemValue, label);
      return next;
    });
  }, []);

  const contextValue = React.useMemo(
    () => ({
      value: value || "",
      onValueChange: handleValueChange,
      open,
      setOpen,
      itemsMap,
      registerItem,
      disabled,
    }),
    [value, handleValueChange, open, itemsMap, registerItem, disabled]
  );

  const selectContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectContainerRef.current &&
        !selectContainerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={selectContainerRef} className={cn("relative inline-block w-full text-left", open ? "z-50" : "z-10")}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a <Select>");
  }
  return context;
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || props.disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/30",
          className
        )}
        {...props}
      >
        <div className="flex-1 truncate text-left">{children}</div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 ml-2",
            open && "rotate-180"
          )}
        />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

function SelectValue({ placeholder = "선택하세요", className, children }: SelectValueProps) {
  const { value, itemsMap } = useSelectContext();

  if (children) {
    return <span className={cn("truncate", className)}>{children}</span>;
  }

  const selectedLabel = itemsMap.get(value);

  if (selectedLabel !== undefined && selectedLabel !== null && selectedLabel !== "") {
    return <span className={cn("truncate font-medium", className)}>{selectedLabel}</span>;
  }

  // Fallback translation dictionary for known raw codes
  const codeLabels: Record<string, string> = {
    ready: "준비",
    progress: "진행 중",
    end: "종료",
    true: "허용 (활성화)",
    false: "금지 (비활성화)",
    all: "전체",
    null: "미지정",
    unassigned: "담당 교사 없음 (미지정)",
  };

  if (value && codeLabels[value]) {
    return <span className={cn("truncate font-medium", className)}>{codeLabels[value]}</span>;
  }

  if (!value) {
    return <span className={cn("text-slate-400 dark:text-slate-500", className)}>{placeholder}</span>;
  }

  return <span className={cn("truncate", className)}>{value}</span>;
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = useSelectContext();

    return (
      <div
        ref={ref}
        className={cn(
          "absolute left-0 top-full z-[9999] mt-1.5 max-h-64 min-w-full w-max max-w-[24rem] sm:max-w-md overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-all duration-150",
          open ? "block opacity-100 scale-100 pointer-events-auto" : "hidden opacity-0 scale-95 pointer-events-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setOpen, registerItem } = useSelectContext();

    React.useEffect(() => {
      registerItem(value, children);
    }, [value, children, registerItem]);

    const isSelected = selectedValue === value;

    return (
      <div
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          onValueChange?.(value);
          setOpen(false);
        }}
        className={cn(
          "relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors outline-none",
          isSelected
            ? "bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
            : "hover:bg-slate-100 dark:hover:bg-slate-800/70 dark:text-slate-200",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        <span className="whitespace-normal break-words flex-1 pr-2 text-left">{children}</span>
        {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-1", className)} {...props} />;
}

function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-[#98989D]", className)} {...props} />;
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-[#2C2C2E]", className)} {...props} />;
}

function SelectScrollUpButton() {
  return null;
}
function SelectScrollDownButton() {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
