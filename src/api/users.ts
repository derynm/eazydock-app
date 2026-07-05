import { api, USE_FIXTURES } from './client';
import * as fx from './fixtures';
import type { Paginator, Single, UserResource } from './types';

type ListParams = { search?: string; page?: number };
type CreateBody = { name: string; email: string; password: string; role_id: number; company_id?: number | null; status: string };
type UpdateBody = { name: string; email: string; role_id: number; company_id?: number | null; status: string };

export async function listUsers(params: ListParams = {}): Promise<Paginator<UserResource>> {
  if (USE_FIXTURES) {
    const { search = '', page = 1 } = params;
    const term = search.toLowerCase();
    const filtered = fx.users.filter(
      (u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    );
    return fx.delay(fx.paginate(filtered, page));
  }
  const { data } = await api.get<Paginator<UserResource>>('/admin/users', { params });
  return data;
}

export async function getUser(id: number): Promise<UserResource> {
  if (USE_FIXTURES) {
    const u = fx.users.find((u) => u.id === id);
    if (!u) throw new Error('User not found');
    return fx.delay(u);
  }
  const { data } = await api.get<Single<UserResource>>(`/admin/users/${id}`);
  return data.data;
}

export async function createUser(body: CreateBody): Promise<UserResource> {
  if (USE_FIXTURES) {
    const role = fx.roles.find((r) => r.id === body.role_id) ?? fx.roles[0];
    const cu = { id: fx.nextId(fx.users.flatMap((u) => u.company_users)), company_id: 3, role_id: role.id, status: body.status as 'active' | 'inactive', role: { id: role.id, name: role.name, slug: role.slug } };
    const user: UserResource = { id: fx.nextId(fx.users), name: body.name, email: body.email, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), company_users: [cu] };
    fx.users.push(user);
    return fx.delay(user);
  }
  const { data } = await api.post<Single<UserResource>>('/admin/users', body);
  return data.data;
}

export async function updateUser(id: number, body: UpdateBody): Promise<UserResource> {
  if (USE_FIXTURES) {
    const idx = fx.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    const role = fx.roles.find((r) => r.id === body.role_id) ?? fx.roles[0];
    const existing = fx.users[idx];
    const updated: UserResource = {
      ...existing,
      name: body.name,
      email: body.email,
      updated_at: new Date().toISOString(),
      company_users: [{ ...existing.company_users[0], role_id: role.id, status: body.status as 'active' | 'inactive', role: { id: role.id, name: role.name, slug: role.slug } }],
    };
    fx.users[idx] = updated;
    return fx.delay(updated);
  }
  const { data } = await api.put<Single<UserResource>>(`/admin/users/${id}`, body);
  return data.data;
}

export async function removeUserFromCompany(id: number): Promise<void> {
  if (USE_FIXTURES) {
    const idx = fx.users.findIndex((u) => u.id === id);
    if (idx !== -1) fx.users.splice(idx, 1);
    return fx.delay(undefined);
  }
  await api.delete(`/admin/users/${id}`);
}
