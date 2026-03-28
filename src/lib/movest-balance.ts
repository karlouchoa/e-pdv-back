import type {
  Prisma,
  PrismaClient as TenantClient,
} from '../../prisma/generated/client_tenant';
import { TenantPrisma } from './prisma-clients';

type TenantClientLike = TenantClient | Prisma.TransactionClient;

export type MovestBalanceInput = {
  cdemp?: unknown;
  cditem?: unknown;
  empitem?: unknown;
  qtde?: unknown;
  st?: unknown;
  isdeleted?: unknown;
};

type BalanceDelta = {
  cdemp: number;
  cditem: number;
  empitem: number;
  delta: number;
};

const ZERO_EPSILON = 0.0000001;

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'object') {
    const numericLike = value as {
      toNumber?: () => number;
      toString?: () => string;
    };
    if (typeof numericLike.toNumber === 'function') {
      const parsed = Number(numericLike.toNumber());
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof numericLike.toString === 'function') {
      const parsed = Number(numericLike.toString());
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalInt(value: unknown): number | null {
  const parsed = toOptionalNumber(value);
  if (parsed === null) return null;
  return Math.trunc(parsed);
}

function toOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeType(value: unknown): 'E' | 'S' {
  return String(value ?? '')
    .trim()
    .toUpperCase() === 'S'
    ? 'S'
    : 'E';
}

function normalizeBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!text) return false;
  return ['1', 'true', 't', 's', 'sim', 'yes', 'y'].includes(text);
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function toBalanceDelta(
  movement: MovestBalanceInput,
  reverse: boolean,
): BalanceDelta | null {
  if (normalizeBool(movement.isdeleted)) {
    return null;
  }

  const cdemp = toOptionalInt(movement.cdemp);
  const cditem = toOptionalInt(movement.cditem);
  if (cdemp === null || cditem === null) {
    return null;
  }

  const quantity = Math.abs(toOptionalNumber(movement.qtde) ?? 0);
  if (!Number.isFinite(quantity) || quantity <= ZERO_EPSILON) {
    return null;
  }

  const direction = normalizeType(movement.st) === 'S' ? -1 : 1;
  const delta = round4(quantity * direction * (reverse ? -1 : 1));
  if (Math.abs(delta) <= ZERO_EPSILON) {
    return null;
  }

  const empitem = toOptionalInt(movement.empitem) ?? cdemp;

  return {
    cdemp,
    cditem,
    empitem,
    delta,
  };
}

function mergeDeltas(input: BalanceDelta[]): BalanceDelta[] {
  const grouped = new Map<string, BalanceDelta>();

  for (const row of input) {
    const key = `${row.cdemp}:${row.cditem}:${row.empitem}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...row });
      continue;
    }

    existing.delta = round4(existing.delta + row.delta);
  }

  return Array.from(grouped.values()).filter(
    (row) => Math.abs(row.delta) > ZERO_EPSILON,
  );
}

async function upsertSaldoDelta(
  prisma: TenantClientLike,
  row: BalanceDelta,
): Promise<void> {
  await prisma.$executeRaw(
    TenantPrisma.sql`
      INSERT INTO t_saldoit (
        cdemp,
        cditem,
        empitem,
        saldo,
        dtaltsld,
        createdat,
        updatedat
      )
      VALUES (
        ${row.cdemp},
        ${row.cditem},
        ${row.empitem},
        ${row.delta},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (cdemp, cditem, empitem)
      DO UPDATE SET
        saldo = COALESCE(t_saldoit.saldo, 0) + COALESCE(EXCLUDED.saldo, 0),
        dtaltsld = CURRENT_TIMESTAMP,
        updatedat = CURRENT_TIMESTAMP
    `,
  );
}

export async function applyMovestBalanceChanges(
  prisma: TenantClientLike,
  payload: Array<{ movement: MovestBalanceInput; reverse?: boolean }>,
): Promise<void> {
  const deltas = mergeDeltas(
    payload
      .map((entry) => toBalanceDelta(entry.movement, entry.reverse === true))
      .filter((entry): entry is BalanceDelta => entry !== null),
  );

  for (const row of deltas) {
    await upsertSaldoDelta(prisma, row);
  }
}

export async function applyMovestBalanceFromCreates(
  prisma: TenantClientLike,
  movements: MovestBalanceInput[],
): Promise<void> {
  await applyMovestBalanceChanges(
    prisma,
    movements.map((movement) => ({ movement })),
  );
}
