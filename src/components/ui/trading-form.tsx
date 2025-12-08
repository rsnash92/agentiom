'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Fieldset - Bordered group with floating label (like the Strategy, Limit Price sections)
// ============================================================================
interface FieldsetProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Fieldset({ label, children, className }: FieldsetProps) {
  return (
    <fieldset className={cn('relative border border-border/60 rounded-lg p-3 pt-2', className)}>
      <legend className="px-2 text-xs text-foreground-muted font-mono">{label}</legend>
      {children}
    </fieldset>
  );
}

// ============================================================================
// CollapsibleSection - Expandable section with header (Exit Conditions, Scale Orders)
// ============================================================================
interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ title, children, defaultOpen = true, className }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-border/60 rounded-lg overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-background hover:bg-background-secondary transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-foreground-muted text-lg leading-none">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="p-4 pt-2 border-t border-border/40">{children}</div>}
    </div>
  );
}

// ============================================================================
// TabGroup - Buy/Sell style tabs
// ============================================================================
interface Tab {
  value: string;
  label: string;
  variant?: 'success' | 'error' | 'default';
}

interface TabGroupProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TabGroup({ tabs, value, onChange, className }: TabGroupProps) {
  return (
    <div className={cn('flex rounded-lg overflow-hidden border border-border/60', className)}>
      {tabs.map((tab) => {
        const isSelected = value === tab.value;
        const variantStyles = {
          success: isSelected ? 'bg-success text-black' : 'bg-background text-foreground-muted hover:text-foreground',
          error: isSelected ? 'bg-error text-white' : 'bg-background text-foreground-muted hover:text-foreground',
          default: isSelected ? 'bg-background-secondary text-foreground' : 'bg-background text-foreground-muted hover:text-foreground',
        };
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              variantStyles[tab.variant || 'default']
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// FormInput - Input with floating label inside fieldset style
// ============================================================================
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, suffix, className, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <span className="absolute -top-2.5 left-3 px-1 bg-background text-[10px] text-foreground-muted font-mono">
            {label}
          </span>
        )}
        <div className="flex items-center border border-border/60 rounded-lg bg-background overflow-hidden">
          <input
            ref={ref}
            className={cn(
              'flex-1 px-3 py-2.5 bg-transparent text-sm font-mono',
              'placeholder:text-foreground-subtle focus:outline-none',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="px-3 text-sm text-foreground-muted border-l border-border/40">
              {suffix}
            </div>
          )}
        </div>
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

// ============================================================================
// FormSelect - Select with floating label
// ============================================================================
interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, className, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <span className="absolute -top-2.5 left-3 px-1 bg-background text-[10px] text-foreground-muted font-mono z-10">
            {label}
          </span>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2.5 bg-background border border-border/60 rounded-lg',
            'text-sm font-mono appearance-none cursor-pointer',
            'focus:outline-none focus:border-border',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';

// ============================================================================
// SegmentedControl - Urgency selector style (Very Low, Low, Medium, High, Very High)
// ============================================================================
interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('flex rounded-lg overflow-hidden border border-border/60', className)}>
      {options.map((opt, idx) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              idx !== 0 && 'border-l border-border/40',
              isSelected
                ? 'bg-success text-black'
                : 'bg-background text-foreground-muted hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// RadioGroup - Radio buttons with labels (Mid, Bid, etc.)
// ============================================================================
interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
}

export function RadioGroup({ options, value, onChange, name, className }: RadioGroupProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 transition-colors',
                value === opt.value
                  ? 'border-foreground bg-foreground'
                  : 'border-foreground-muted'
              )}
            >
              {value === opt.value && (
                <div className="absolute inset-1 rounded-full bg-background" />
              )}
            </div>
          </div>
          <span className="text-xs text-foreground-muted">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

// ============================================================================
// Checkbox - Styled checkbox
// ============================================================================
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ label, checked, onChange, className }: CheckboxProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', className)}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 rounded border transition-colors flex items-center justify-center',
            checked
              ? 'bg-foreground border-foreground'
              : 'border-foreground-muted bg-transparent'
          )}
        >
          {checked && (
            <svg className="w-3 h-3 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-foreground-muted">{label}</span>
    </label>
  );
}

// ============================================================================
// RangeSlider - Slider with optional ticks
// ============================================================================
interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showTicks?: boolean;
  className?: string;
}

export function RangeSlider({ value, onChange, min = 0, max = 100, step = 1, showTicks = false, className }: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('relative', className)}>
      <div className="relative h-1 bg-border/60 rounded-full">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-md"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>
      {showTicks && (
        <div className="flex justify-between mt-1.5 px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-px h-1.5 bg-border/60" />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActionButton - Submit button styles
// ============================================================================
interface ActionButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outline';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export function ActionButton({ children, variant = 'primary', disabled, onClick, className, type = 'button' }: ActionButtonProps) {
  const variants = {
    primary: 'bg-primary text-black hover:bg-primary/90',
    secondary: 'bg-background-secondary text-foreground hover:bg-card',
    success: 'bg-success text-black hover:bg-success/90',
    error: 'bg-error text-white hover:bg-error/90',
    outline: 'bg-transparent border border-border text-foreground hover:bg-background-secondary',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full py-3 rounded-lg text-sm font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// DualInputRow - Two inputs side by side with labels (like Take Profit % and Price)
// ============================================================================
interface DualInputRowProps {
  leftLabel: string;
  leftValue: string;
  leftOnChange: (value: string) => void;
  leftSuffix?: ReactNode;
  rightLabel: string;
  rightValue: string;
  rightOnChange: (value: string) => void;
  rightSuffix?: ReactNode;
  className?: string;
}

export function DualInputRow({
  leftLabel,
  leftValue,
  leftOnChange,
  leftSuffix,
  rightLabel,
  rightValue,
  rightOnChange,
  rightSuffix,
  className,
}: DualInputRowProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <FormInput
        label={leftLabel}
        value={leftValue}
        onChange={(e) => leftOnChange(e.target.value)}
        suffix={leftSuffix}
      />
      <FormInput
        label={rightLabel}
        value={rightValue}
        onChange={(e) => rightOnChange(e.target.value)}
        suffix={rightSuffix}
      />
    </div>
  );
}

// ============================================================================
// InfoRow - Label + Value display row
// ============================================================================
interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-center justify-between text-xs', className)}>
      <span className="text-foreground-muted font-mono underline underline-offset-2 decoration-dotted decoration-foreground-subtle">{label}</span>
      <span className="text-foreground-muted font-mono">{value}</span>
    </div>
  );
}

// ============================================================================
// DateTimeInput - Date/time input with icon
// ============================================================================
interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateTimeInput({ label, value, onChange, className }: DateTimeInputProps) {
  return (
    <div className={cn('relative', className)}>
      <span className="absolute -top-2.5 left-3 px-1 bg-background text-[10px] text-foreground-muted font-mono z-10">
        {label}
      </span>
      <div className="flex items-center border border-border/60 rounded-lg bg-background overflow-hidden">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-transparent text-sm font-mono focus:outline-none [color-scheme:dark]"
        />
        <div className="px-3 text-foreground-muted">
          <CalendarIcon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
