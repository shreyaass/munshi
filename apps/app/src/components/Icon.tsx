import type { ComponentProps } from 'react';
import {
  ArrowLeftRight,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ClockArrowDown,
  Cloud,
  Info,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * One icon family for the whole app (Lucide, via lucide-react) so stroke
 * weight, optical size and alignment stay consistent. Call sites keep the same
 * `<Icon name="…" />` API and can override `strokeWidth`/sizing with classes.
 */
const ICONS = {
  add: Plus,
  history: ClockArrowDown,
  chart: ChartColumn,
  settings: Settings,
  wallet: Wallet,
  back: ChevronLeft,
  close: X,
  edit: Pencil,
  'arrow-left-right': ArrowLeftRight,
  cloud: Cloud,
  info: Info,
  check: Check,
  alert: TriangleAlert,
  'chevron-down': ChevronDown,
  search: Search,
  trash: Trash2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type IconProps = Omit<ComponentProps<LucideIcon>, 'name'> & { name: IconName };

export function Icon({ name, strokeWidth = 1.9, ...rest }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}
