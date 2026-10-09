import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flag,
  GripVertical,
  Inbox,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Tag,
  Tags,
  Trash2,
  User,
  Users,
  X,
  type LucideIconData,
} from 'lucide-angular';

const REGISTRY = {
  alert: AlertTriangle,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  board: KanbanSquare,
  calendar: Calendar,
  calendarClock: CalendarClock,
  check: Check,
  checkAll: CheckCheck,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  clock: Clock,
  dashboard: LayoutDashboard,
  doc: FileText,
  error: CircleAlert,
  eye: Eye,
  eyeOff: EyeOff,
  filter: Filter,
  flag: Flag,
  grip: GripVertical,
  inbox: Inbox,
  layers: Layers,
  list: List,
  lock: Lock,
  logout: LogOut,
  menu: Menu,
  message: MessageSquare,
  moon: Moon,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  settings: Settings,
  sun: Sun,
  tag: Tag,
  tags: Tags,
  trash: Trash2,
  user: User,
  users: Users,
  x: X,
} satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof REGISTRY;

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `<i-lucide [img]="data()" [size]="size()" />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    `,
  ],
})
export class AppIconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly data = computed(() => REGISTRY[this.name()]);
}
