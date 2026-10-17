import { vi } from "vitest";

export type Result = { data?: unknown; error?: unknown };
export type Call = { table: string; ops: [string, unknown[]][] };

/**
 * A chainable stand-in for the generated client. Each awaited query on a table
 * takes the next queued result for that table (default: empty data, no error).
 */
export function fakeSupabase() {
  const results: Record<string, Result[]> = {};
  const calls: Call[] = [];
  const rpc = vi.fn();
  const storage = { list: vi.fn(), remove: vi.fn(), buckets: [] as string[] };
  const deleteUser = vi.fn();
  function from(table: string) {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const op of [
      "select",
      "eq",
      "in",
      "or",
      "order",
      "update",
      "delete",
      "insert",
      "upsert",
      "maybeSingle",
      "single",
    ])
      builder[op] = (...args: unknown[]) => {
        call.ops.push([op, args]);
        return builder;
      };
    builder["then"] = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => {
      try {
        return Promise.resolve(resolve(results[table]?.shift() ?? { data: [], error: null }));
      } catch (e) {
        return reject ? reject(e) : Promise.reject(e);
      }
    };
    return builder;
  }
  const client = {
    from,
    rpc,
    auth: { admin: { deleteUser } },
    storage: {
      from: (bucket: string) => {
        storage.buckets.push(bucket);
        return { list: storage.list, remove: storage.remove };
      },
    },
  };
  const queue = (table: string, ...r: Result[]) => {
    (results[table] ??= []).push(...r);
  };
  const reset = () => {
    for (const k of Object.keys(results)) delete results[k];
    calls.length = 0;
    rpc.mockReset();
    storage.list.mockReset();
    storage.remove.mockReset();
    storage.buckets.length = 0;
    deleteUser.mockReset();
  };
  const ops = (table: string) => calls.filter((c) => c.table === table).map((c) => c.ops);
  return { client, queue, calls, rpc, storage, deleteUser, reset, ops };
}

/** Mirrors createServerFn: middleware/inputValidator chain, handler gets { data, context }. */
export function serverFnMock(context: () => unknown) {
  return {
    createServerFn: () => {
      let validate = (d: unknown) => d;
      const builder = {
        middleware: () => builder,
        inputValidator: (fn: typeof validate) => {
          validate = fn;
          return builder;
        },
        handler:
          (fn: (a: { data: unknown; context: unknown }) => unknown) =>
          (args?: { data: unknown }) =>
            fn({ data: validate(args?.data), context: context() }),
      };
      return builder;
    },
  };
}
