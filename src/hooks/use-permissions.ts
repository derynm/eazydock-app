import { useCallback } from 'react';

import type { PermissionAction } from '@/api/types';
import { useSession } from '@/auth/session';

/**
 * UI permission gate. `can(slug, action)` mirrors the backend
 * `is_super_admin || permissions[slug]?.[action]` rule (plan §4.5).
 * The server still enforces every write — this only hides/disables UI.
 */
export function usePermissions() {
  const { permissions, isSuperAdmin } = useSession();

  const can = useCallback(
    (slug: string, action: PermissionAction = 'view') => {
      if (isSuperAdmin) return true;
      return Boolean(permissions[slug]?.[action]);
    },
    [permissions, isSuperAdmin],
  );

  return { can };
}
