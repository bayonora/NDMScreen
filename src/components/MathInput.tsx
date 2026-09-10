import { useState, useEffect, InputHTMLAttributes, FocusEvent, KeyboardEvent } from 'react';
import { cn } from '../lib/utils';

interface MathInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onValueChange: (val: number) => void;
}

export function MathInput({ value, onValueChange, className, onBlur, onKeyDown, onFocus, ...props }: MathInputProps) {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  const evaluateMath = (expr: string): number | null => {
    try {
      if (!/^[0-9+\-*/.\s]+$/.test(expr)) return null;
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expr}`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return Math.floor(result);
      }
      return null;
    } catch {
      return null;
    }
  };

  const commit = () => {
    const val = evaluateMath(localValue);
    if (val !== null) {
      onValueChange(val);
      setLocalValue(val.toString());
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    commit();
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
      onFocus={(e) => { setIsFocused(true); if (onFocus) onFocus(e); }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("outline-none transition-colors", className)}
    />
  );
}
