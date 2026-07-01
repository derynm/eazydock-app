import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchUser, login as apiLogin, logout as apiLogout } from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import type { Company, PermissionMap, User } from '@/api/types';
import { storage, StorageKeys } from '@/lib/storage';

type Status = 'loading' | 'authed' | 'guest';

type SessionValue = {
  status: Status;
  user: User | null;
  companies: Company[];
  activeCompanyId: number | null;
  permissions: PermissionMap;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: number) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const applyPayload = useCallback(
    async (payload: Awaited<ReturnType<typeof fetchUser>>) => {
      setUser(payload.user);
      setCompanies(payload.companies);
      setPermissions(payload.permissions);
      setIsSuperAdmin(payload.is_super_admin);
      const active = payload.active_company_id ?? payload.companies[0]?.id ?? null;
      setActiveCompanyId(active);
      if (active != null) await storage.set(StorageKeys.companyId, String(active));
    },
    [],
  );

  const clearSession = useCallback(async () => {
    await storage.remove(StorageKeys.token);
    await storage.remove(StorageKeys.companyId);
    setUser(null);
    setCompanies([]);
    setActiveCompanyId(null);
    setPermissions({});
    setIsSuperAdmin(false);
    setStatus('guest');
    queryClient.clear();
  }, [queryClient]);

  // Force logout from the axios 401 interceptor.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
  }, [clearSession]);

  // Bootstrap from a persisted token.
  useEffect(() => {
    (async () => {
      const token = await storage.get(StorageKeys.token);
      if (!token) {
        setStatus('guest');
        return;
      }
      try {
        await applyPayload(await fetchUser());
        setStatus('authed');
      } catch {
        await clearSession();
      }
    })();
  }, [applyPayload, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin({ email, password, device_name: 'eazydock-admin' });
      await storage.set(StorageKeys.token, res.token);
      await applyPayload(res);
      setStatus('authed');
    },
    [applyPayload],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* revoke best-effort */
    }
    await clearSession();
  }, [clearSession]);

  const switchCompany = useCallback(
    async (companyId: number) => {
      setActiveCompanyId(companyId);
      await storage.set(StorageKeys.companyId, String(companyId));
      // Re-fetch permissions for the new scope, then reload every list.
      try {
        await applyPayload(await fetchUser());
      } catch {
        /* keep optimistic id */
      }
      await queryClient.invalidateQueries();
    },
    [applyPayload, queryClient],
  );

  const value = useMemo<SessionValue>(
    () => ({ status, user, companies, activeCompanyId, permissions, isSuperAdmin, login, logout, switchCompany }),
    [status, user, companies, activeCompanyId, permissions, isSuperAdmin, login, logout, switchCompany],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function useActiveCompany(): Company | null {
  const { companies, activeCompanyId } = useSession();
  return companies.find((c) => c.id === activeCompanyId) ?? null;
}
