import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolWeight } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

type Glyph = { ios: SFSymbol; other: AndroidSymbol };

/**
 * Curated icon set. Each entry maps to an SF Symbol (iOS) and a Material
 * Symbol name (Android / web) so a single `name` works everywhere.
 */
const ICONS = {
  dashboard: { ios: 'square.grid.2x2.fill', other: 'grid_view' },
  transactions: { ios: 'car.fill', other: 'directions_car' },
  bookings: { ios: 'calendar', other: 'event' },
  drivers: { ios: 'person.fill', other: 'person' },
  vehicles: { ios: 'car.2.fill', other: 'commute' },
  tenants: { ios: 'building.2.fill', other: 'apartment' },

  search: { ios: 'magnifyingglass', other: 'search' },
  add: { ios: 'plus', other: 'add' },
  close: { ios: 'xmark', other: 'close' },
  menu: { ios: 'line.3.horizontal', other: 'menu' },
  sidebar: { ios: 'sidebar.left', other: 'menu_open' },
  filter: { ios: 'line.3.horizontal.decrease', other: 'filter_list' },
  refresh: { ios: 'arrow.clockwise', other: 'refresh' },
  more: { ios: 'ellipsis', other: 'more_horiz' },
  listView: { ios: 'list.bullet', other: 'view_list' },
  tableView: { ios: 'tablecells', other: 'table_rows' },
  download: { ios: 'square.and.arrow.down', other: 'file_download' },
  share: { ios: 'square.and.arrow.up', other: 'ios_share' },

  chevronRight: { ios: 'chevron.right', other: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', other: 'chevron_left' },
  chevronDown: { ios: 'chevron.down', other: 'expand_more' },
  arrowLeft: { ios: 'arrow.left', other: 'arrow_back' },
  arrowRight: { ios: 'arrow.right', other: 'arrow_forward' },

  check: { ios: 'checkmark', other: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', other: 'check_circle' },
  xCircle: { ios: 'xmark.circle.fill', other: 'cancel' },
  warning: { ios: 'exclamationmark.triangle.fill', other: 'warning' },
  alert: { ios: 'exclamationmark.circle.fill', other: 'error' },
  info: { ios: 'info.circle.fill', other: 'info' },

  clock: { ios: 'clock.fill', other: 'schedule' },
  pin: { ios: 'mappin.and.ellipse', other: 'location_on' },
  swap: { ios: 'arrow.left.arrow.right', other: 'swap_horiz' },
  phone: { ios: 'phone.fill', other: 'call' },
  mail: { ios: 'envelope.fill', other: 'mail' },
  card: { ios: 'creditcard.fill', other: 'credit_card' },
  tag: { ios: 'tag.fill', other: 'sell' },
  building: { ios: 'building.2.fill', other: 'apartment' },

  edit: { ios: 'pencil', other: 'edit' },
  trash: { ios: 'trash.fill', other: 'delete' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', other: 'logout' },
  bell: { ios: 'bell.fill', other: 'notifications' },
  camera: { ios: 'camera.fill', other: 'photo_camera' },
  image: { ios: 'photo.fill', other: 'image' },
  carIn: { ios: 'arrow.down.right.circle.fill', other: 'login' },
  carOut: { ios: 'arrow.up.right.circle.fill', other: 'logout' },

  eye: { ios: 'eye.fill', other: 'visibility' },
  eyeOff: { ios: 'eye.slash.fill', other: 'visibility_off' },
  lock: { ios: 'lock.fill', other: 'lock' },
  user: { ios: 'person.crop.circle.fill', other: 'account_circle' },
  moon: { ios: 'moon.fill', other: 'dark_mode' },
  sun: { ios: 'sun.max.fill', other: 'light_mode' },
  dot: { ios: 'circle.fill', other: 'circle' },
  occupancy: { ios: 'square.grid.3x3.fill', other: 'grid_on' },

  scan: { ios: 'qrcode.viewfinder', other: 'crop_free' },
  torch: { ios: 'flashlight.on.fill', other: 'flashlight_on' },
  torchOff: { ios: 'flashlight.off.fill', other: 'flashlight_off' },

  // Phase 2
  buildings: { ios: 'building.fill', other: 'home_work' },
  parkingArea: { ios: 'rectangle.fill.on.rectangle.fill', other: 'layers' },
  parkingSpace: { ios: 'square.grid.3x3.fill', other: 'grid_on' },
  allocation: { ios: 'arrow.triangle.2.circlepath', other: 'autorenew' },
  incident: { ios: 'exclamationmark.triangle.fill', other: 'security' },
  grid: { ios: 'square.grid.2x2.fill', other: 'grid_view' },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: SymbolWeight;
};

export function Icon({ name, size = 22, color, weight = 'medium' }: Props) {
  const theme = useTheme();
  const entry = ICONS[name];
  return (
    <SymbolView
      name={{ ios: entry.ios, android: entry.other, web: entry.other }}
      size={size}
      weight={weight}
      tintColor={color ?? theme.text}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
