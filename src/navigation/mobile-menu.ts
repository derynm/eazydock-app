import type { IconName } from '@/components/ui';

/**
 * Curated mobile navigation (plan §4.6 — DECISION A). The sidebar renders
 * groups whose items pass `can(slug, 'view')`; groups with no visible item
 * are hidden. Add/reorder freely here without touching the backend.
 */
export type MenuItem = {
  key: string;
  label: string;
  route: string;
  icon: IconName;
  slug: string;
};

export type MenuGroup = {
  key: string;
  title?: string;
  items: MenuItem[];
};

export const MOBILE_MENU: MenuGroup[] = [
  {
    key: 'overview',
    items: [{ key: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'dashboard', slug: 'dashboard' }],
  },
  {
    key: 'operations',
    title: 'Operations',
    items: [
      { key: 'transactions', label: 'Transactions', route: '/transactions', icon: 'transactions', slug: 'operations.transactions' },
      { key: 'bookings', label: 'Bookings', route: '/bookings', icon: 'bookings', slug: 'operations.bookings' },
      { key: 'incidents', label: 'Incidents', route: '/incidents', icon: 'incident', slug: 'operations.incidents' },
    ],
  },
  {
    key: 'people',
    title: 'People & Vehicles',
    items: [
      { key: 'drivers', label: 'Drivers', route: '/drivers', icon: 'drivers', slug: 'people_vehicles.drivers' },
      { key: 'vehicles', label: 'Vehicles', route: '/vehicles', icon: 'vehicles', slug: 'people_vehicles.vehicles' },
    ],
  },
  {
    key: 'locations',
    title: 'Locations',
    items: [
      { key: 'tenants', label: 'Tenants', route: '/tenants', icon: 'tenants', slug: 'locations.tenants' },
      { key: 'buildings', label: 'Buildings', route: '/buildings', icon: 'buildings', slug: 'locations.buildings' },
      { key: 'parking-areas', label: 'Parking Areas', route: '/parking-areas', icon: 'parkingArea', slug: 'locations.parking_areas' },
      { key: 'parking-spaces', label: 'Parking Spaces', route: '/parking-spaces', icon: 'parkingSpace', slug: 'locations.spaces' },
      { key: 'allocations', label: 'Allocations', route: '/allocations', icon: 'allocation', slug: 'locations.allocations' },
    ],
  },
  {
    key: 'administration',
    title: 'Administration',
    items: [
      { key: 'users', label: 'Users', route: '/users', icon: 'user', slug: 'administration.users' },
    ],
  },
];

/** Flat lookup of the active route -> menu item (for the header title). */
export function findMenuItem(pathname: string): MenuItem | undefined {
  const all = MOBILE_MENU.flatMap((g) => g.items);
  return all.find((i) => pathname.startsWith(i.route));
}
