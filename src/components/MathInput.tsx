import { useState, useEffect, useRef, InputHTMLAttributes, FocusEvent, KeyboardEvent } from 'react';
import { cn } from '../lib/utils';
import { evaluateExpr, isRelative } from '../lib/mathExpr';

interface MathInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onValueChange: (val: number) => void;
  /** "-5" / "+5" change the current value instead of replacing it. */
  relative?: boolean;
}

export function MathInput({ value, onValueChange, relative, className, onBlur, onKeyDown, onFocus, ...props }: MathInputProps) {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  const commit = () => {
    let val = evaluateExpr(localValue);
    if (val !== null && relative && isRelative(localValue)) val = value + val;
    if (val !== null) {
      onValueChange(val);
      setLocalValue(val.toString());
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (cancelled.current) { cancelled.current = false; setLocalValue(value.toString()); } else commit();
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      // Drop the edit: leave the field without applying it.
      e.stopPropagation();
      cancelled.current = true;
      e.currentTarget.blur();
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <input
      {...props}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={(e) => { setIsFocused(true); e.currentTarget.select(); if (onFocus) onFocus(e); }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("outline-none transition-colors", className)}
    />
  );
}
