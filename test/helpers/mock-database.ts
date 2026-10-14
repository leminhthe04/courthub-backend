import { jest } from '@jest/globals';

type MockDatabaseOptions = {
  rows?: unknown[];
  queryResult?: unknown;
  transactionRows?: unknown[];
  returningRows?: unknown[];
};

function createChain(result: unknown, returningRows?: unknown[]): any {
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get(_target, property: string | symbol) {
      if (typeof property === 'string' && property in target) return target[property];
      if (property === 'then') {
        return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      if (property === 'returning' || property === 'execute') {
        const value = property === 'returning' ? (returningRows ?? [undefined]) : result;
        return jest.fn<() => Promise<any>>().mockResolvedValue(value);
      }
      return jest.fn().mockReturnValue(createChain(result));
    },
  });
}

export function createMockDatabase(options: MockDatabaseOptions = {}): any {
  const rows = options.rows ?? [];
  const database = createChain(rows, options.returningRows);
  database.transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(createChain(options.transactionRows ?? rows, options.returningRows)),
  );
  database.query = new Proxy(
    {},
    {
      get() {
        return new Proxy(
          {},
          {
            get() {
              return jest.fn<() => Promise<any>>().mockResolvedValue(options.queryResult);
            },
          },
        );
      },
    },
  );
  return database;
}
