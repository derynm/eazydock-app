import type { Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Minimal react-hook-form resolver for zod (so we don't pull in
 * @hookform/resolvers). Maps zod issues to RHF field errors.
 */
export function zodResolver<T extends Record<string, unknown>>(schema: ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !errors[key]) errors[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as never };
  };
}
