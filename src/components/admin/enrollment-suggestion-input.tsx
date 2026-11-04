"use client";

import { useRef, useState, useId, type ComponentProps } from "react";

interface Props extends Omit<ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  suggestion: string;
  onValueChange: (value: string) => void;
}

export default function EnrollmentSuggestionInput({ value, suggestion, onValueChange, className = "", onFocus, onBlur, onKeyDown, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const completion = focused && suggestion.length > value.length && suggestion.toLowerCase().startsWith(value.toLowerCase()) ? suggestion : "";
  const accept = () => { onValueChange(suggestion); input.current?.focus(); };

  return (
    <div className="relative min-w-0">
      <input
        {...props}
        ref={input}
        aria-autocomplete="inline"
        aria-describedby={[props["aria-describedby"], completion ? hintId : undefined].filter(Boolean).join(" ") || undefined}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !event.nativeEvent.isComposing && completion) {
            event.preventDefault();
            accept();
          }
          onKeyDown?.(event);
        }}
        className={`${className} ${completion ? "placeholder:text-transparent" : ""}`}
      />
      {completion && (
        <>
          <span className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-2 text-sm text-slate-500 ${className.includes("font-mono") ? "font-mono" : ""}`}>
            <span aria-hidden="true" className="invisible">{value}</span>
            <button type="button" tabIndex={-1} aria-label={`Accept suggestion ${completion}`} onMouseDown={(event) => event.preventDefault()} onClick={accept} className="pointer-events-auto whitespace-pre text-left">
              {completion.slice(value.length)}<span className="font-sans text-[10px]"> (Press Tab to accept)</span>
            </button>
          </span>
          <span id={hintId} className="sr-only">Suggestion: {completion}. Press Tab to accept.</span>
        </>
      )}
    </div>
  );
}
