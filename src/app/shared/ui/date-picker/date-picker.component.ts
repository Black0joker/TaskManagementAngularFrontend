import { OverlayModule } from '@angular/cdk/overlay';
import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { AppIconComponent } from '../icon/app-icon.component';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  formatDisplay,
  formatRange,
  isoWeekNumber,
  monthMatrix,
  parseKey,
  toKey,
  todayKey,
  type CalendarDay,
  type DateRange,
} from './date-picker.utils';

export type DatePickerMode = 'single' | 'range';

const YEAR_BACK = 5;
const YEAR_FWD = 15;

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [FormsModule, OverlayModule, AppIconComponent],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
})
export class DatePickerComponent implements ControlValueAccessor {
  /** 'single' emits yyyy-MM-dd|null; 'range' emits {from,to}. */
  readonly mode = input<DatePickerMode>('single');
  readonly placeholder = input('Select a date');
  readonly inputId = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  /** Disallow past days (task due dates). */
  readonly minToday = input(false);
  readonly disabled = signal(false);

  readonly open = signal(false);
  readonly pickingMonth = signal(false);

  // Single-mode value as key; range-mode as {from,to} keys.
  private readonly singleKey = signal<string | null>(null);
  private readonly rangeVal = signal<DateRange>({ from: null, to: null });
  private rangeAnchor: string | null = null;
  readonly hoverKey = signal<string | null>(null);

  readonly viewDate = signal<Date>(new Date());
  readonly focusKey = signal<string>(todayKey());
  readonly today = signal<string>(todayKey());
  readonly weekdays = WEEKDAY_SHORT;
  readonly months = MONTH_NAMES;

  private onChange: (v: string | DateRange | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  // ---------- ControlValueAccessor ----------
  writeValue(v: string | DateRange | null | undefined): void {
    if (this.mode() === 'range') {
      const r = (v ?? null) as DateRange | null;
      this.rangeVal.set({ from: r?.from ?? null, to: r?.to ?? null });
      this.rangeAnchor = null;
      const focus = this.rangeVal().from ?? this.rangeVal().to ?? todayKey();
      this.focusKey.set(focus);
      const d = parseKey(focus);
      if (d) this.viewDate.set(d);
    } else {
      const key = typeof v === 'string' && v ? v : null;
      this.singleKey.set(key);
      const d = parseKey(key) ?? new Date();
      this.viewDate.set(d);
      this.focusKey.set(key ?? todayKey());
    }
  }

  registerOnChange(fn: (v: string | DateRange | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ---------- Derived ----------
  readonly display = computed(() =>
    this.mode() === 'range'
      ? formatRange(this.rangeVal()) || this.placeholder()
      : formatDisplay(this.singleKey()) || this.placeholder(),
  );
  readonly hasValue = computed(() =>
    this.mode() === 'range'
      ? !!(this.rangeVal().from || this.rangeVal().to)
      : !!this.singleKey(),
  );
  readonly weeks = computed(() => {
    const v = this.viewDate();
    return monthMatrix(v.getFullYear(), v.getMonth());
  });
  readonly title = computed(() => {
    const v = this.viewDate();
    return `${MONTH_NAMES[v.getMonth()]} ${v.getFullYear()}`;
  });
  readonly yearOptions = computed(() => {
    const y = new Date().getFullYear();
    const out: number[] = [];
    for (let i = y - YEAR_BACK; i <= y + YEAR_FWD; i++) out.push(i);
    return out;
  });

  // ---------- Open/close ----------
  toggle(): void {
    if (this.disabled()) return;
    this.open() ? this.close() : this.openPanel();
  }

  openPanel(): void {
    if (this.disabled()) return;
    this.pickingMonth.set(false);
    this.open.set(true);
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.pickingMonth.set(false);
    this.hoverKey.set(null);
    this.rangeAnchor = null;
    this.onTouched();
  }

  // ---------- Selection ----------
  isDisabledDay(day: CalendarDay): boolean {
    if (!this.minToday()) return false;
    return day.key < todayKey();
  }

  isSelected(key: string): boolean {
    if (this.mode() === 'range') {
      const r = this.rangeVal();
      return key === r.from || key === r.to;
    }
    return key === this.singleKey();
  }

  inRangePreview(key: string): boolean {
    if (this.mode() !== 'range') return false;
    const { from, to } = this.rangeVal();
    const hover = this.hoverKey();
    const end = to ?? (this.rangeAnchor ? hover : null);
    if (!from || !end || from === end) return false;
    const [a, b] = from < end ? [from, end] : [end, from];
    return key > a && key < b;
  }

  isRangeEdge(key: string): boolean {
    if (this.mode() !== 'range') return false;
    const { from, to } = this.rangeVal();
    return key === from || (!!to && key === to);
  }

  pick(day: CalendarDay): void {
    if (this.isDisabledDay(day)) return;
    if (this.mode() === 'single') {
      this.singleKey.set(day.key);
      this.focusKey.set(day.key);
      this.onChange(day.key);
      this.close();
      return;
    }
    // Range: first click anchors, second completes (order-normalized).
    if (!this.rangeAnchor || (this.rangeVal().from && this.rangeVal().to)) {
      this.rangeAnchor = day.key;
      this.rangeVal.set({ from: day.key, to: null });
    } else {
      const [from, to] =
        this.rangeAnchor <= day.key ? [this.rangeAnchor, day.key] : [day.key, this.rangeAnchor];
      this.rangeAnchor = null;
      this.hoverKey.set(null);
      this.rangeVal.set({ from, to });
      this.onChange({ from, to });
      this.close();
      return;
    }
    this.focusKey.set(day.key);
  }

  preset(daysAhead: number | null): void {
    if (daysAhead === null) {
      this.clear();
      return;
    }
    const key = toKey(addDays(new Date(), daysAhead));
    if (this.minToday() && key < todayKey()) return;
    if (this.mode() === 'single') {
      this.singleKey.set(key);
      this.onChange(key);
      this.close();
    } else {
      this.rangeVal.set({ from: key, to: key });
      this.rangeAnchor = null;
      this.onChange({ from: key, to: key });
      this.close();
    }
  }

  clear(): void {
    if (this.mode() === 'single') {
      this.singleKey.set(null);
      this.onChange(null);
    } else {
      this.rangeVal.set({ from: null, to: null });
      this.rangeAnchor = null;
      this.onChange({ from: null, to: null });
    }
    this.onTouched();
  }

  // ---------- Navigation ----------
  stepMonth(n: number): void {
    this.viewDate.set(addMonths(this.viewDate(), n));
  }

  pickMonth(m: number): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), m, 1, 12));
    this.pickingMonth.set(false);
  }

  setYear(y: number): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(y, v.getMonth(), 1, 12));
  }

  weekNumber(week: CalendarDay[]): number {
    return isoWeekNumber(week[0].date);
  }

  // ---------- Keyboard ----------
  onGridKeydown(e: KeyboardEvent): void {
    const cur = parseKey(this.focusKey()) ?? new Date();
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(cur, -1); break;
      case 'ArrowRight': next = addDays(cur, 1); break;
      case 'ArrowUp': next = addDays(cur, -7); break;
      case 'ArrowDown': next = addDays(cur, 7); break;
      case 'Home': next = addDays(cur, -((cur.getDay() + 6) % 7)); break;
      case 'End': next = addDays(cur, 6 - ((cur.getDay() + 6) % 7)); break;
      case 'PageUp': next = addMonths(cur, -1); break;
      case 'PageDown': next = addMonths(cur, 1); break;
      case 'Enter':
      case ' ': {
        const key = toKey(cur);
        const day: CalendarDay = { date: cur, key, inMonth: true };
        if (!(this.minToday() && key < todayKey())) this.pick(day);
        e.preventDefault();
        return;
      }
      case 'Escape': this.close(); return;
      default: return;
    }
    e.preventDefault();
    if (next) {
      const key = toKey(next);
      this.focusKey.set(key);
      const v = this.viewDate();
      if (next.getMonth() !== v.getMonth() || next.getFullYear() !== v.getFullYear()) {
        this.viewDate.set(next);
      }
      queueMicrotask(() =>
        document.querySelector<HTMLElement>(`[data-day="${key}"]`)?.focus(),
      );
    }
  }
}
