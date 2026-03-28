import { getTenantTableColumns } from './tenant-schema-compat';

type TenantSchemaClient = {
  $queryRawUnsafe: <T = unknown>(query: string) => Promise<T>;
};

type TableColumnsInfo = Awaited<
  ReturnType<typeof getTenantTableColumns>
>;

export type CompatibleComboRuleRow = {
  autocod: number | null;
  cditem: number | null;
  cdgru: number;
  qtde: unknown;
  createdat: Date | null;
  updatedat: Date | null;
  subgroupAutocod: number | null;
  subgroupCdsub: number | null;
  subgroupLabel: string | null;
};

export type CompatibleComboSubgroupRow = {
  autocod: number | null;
  cdsub: number | null;
  desub: string | null;
};

type ComboSchemaInfo = {
  combo: {
    autocod: string | null;
    cditem: string | null;
    cdgru: string | null;
    qtde: string | null;
    createdat: string | null;
    updatedat: string | null;
  };
  subgr: {
    autocod: string | null;
    cdsub: string | null;
    desub: string | null;
  };
};

const schemaInfoCache = new WeakMap<object, Promise<ComboSchemaInfo>>();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function integerList(values: number[]): string {
  const normalized = Array.from(
    new Set(
      values.filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
  return normalized.length ? normalized.join(', ') : '';
}

function pickExistingColumn(
  columns: TableColumnsInfo,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    if (columns.exact.has(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    const lowered = candidate.toLowerCase();
    if (!columns.lower.has(lowered)) {
      continue;
    }

    for (const exact of columns.exact) {
      if (exact.toLowerCase() === lowered) {
        return exact;
      }
    }

    return lowered;
  }

  return null;
}

async function getComboSchemaInfo(
  prisma: TenantSchemaClient,
): Promise<ComboSchemaInfo> {
  const cacheKey = prisma as object;
  const cached = schemaInfoCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const infoPromise = (async () => {
    const [comboColumns, subgroupColumns] = await Promise.all([
      getTenantTableColumns(prisma as any, 't_itenscombo'),
      getTenantTableColumns(prisma as any, 't_subgr'),
    ]);

    return {
      combo: {
        autocod: pickExistingColumn(comboColumns, ['autocod', 'AUTOCOD']),
        cditem: pickExistingColumn(comboColumns, ['cditem', 'CDITEM']),
        cdgru: pickExistingColumn(comboColumns, ['cdgru', 'CDGRU']),
        qtde: pickExistingColumn(comboColumns, ['qtde', 'QTDE']),
        createdat: pickExistingColumn(comboColumns, [
          'createdat',
          'CREATEDAT',
        ]),
        updatedat: pickExistingColumn(comboColumns, [
          'updatedat',
          'UPDATEDAT',
        ]),
      },
      subgr: {
        autocod: pickExistingColumn(subgroupColumns, ['autocod', 'AUTOCOD']),
        cdsub: pickExistingColumn(subgroupColumns, ['cdsub', 'CDSUB']),
        desub: pickExistingColumn(subgroupColumns, ['desub', 'DESUB']),
      },
    };
  })();

  schemaInfoCache.set(cacheKey, infoPromise);
  return infoPromise;
}

async function listComboSubgroupsByIdentifiers(
  prisma: TenantSchemaClient,
  identifiers: number[],
): Promise<CompatibleComboSubgroupRow[]> {
  const values = integerList(identifiers);
  if (!values) {
    return [];
  }

  const schema = await getComboSchemaInfo(prisma);
  const clauses: string[] = [];

  if (schema.subgr.autocod) {
    clauses.push(`${quoteIdentifier(schema.subgr.autocod)} IN (${values})`);
  }
  if (schema.subgr.cdsub) {
    clauses.push(`${quoteIdentifier(schema.subgr.cdsub)} IN (${values})`);
  }

  if (!clauses.length) {
    return [];
  }

  const query = `
    SELECT
      ${
        schema.subgr.autocod
          ? `${quoteIdentifier(schema.subgr.autocod)}::int`
          : 'NULL::int'
      } AS "autocod",
      ${
        schema.subgr.cdsub
          ? `${quoteIdentifier(schema.subgr.cdsub)}::int`
          : 'NULL::int'
      } AS "cdsub",
      ${
        schema.subgr.desub
          ? `${quoteIdentifier(schema.subgr.desub)}`
          : 'NULL::varchar'
      } AS "desub"
    FROM t_subgr
    WHERE ${clauses.join(' OR ')}
  `;

  return prisma.$queryRawUnsafe<CompatibleComboSubgroupRow[]>(query);
}

function matchSubgroupByComboIdentifier(
  subgroupRows: CompatibleComboSubgroupRow[],
  comboIdentifier: number,
): CompatibleComboSubgroupRow | null {
  return (
    subgroupRows.find((row) => row.autocod === comboIdentifier) ??
    subgroupRows.find((row) => row.cdsub === comboIdentifier) ??
    null
  );
}

export async function listCompatibleComboRulesByItemCodes(
  prisma: TenantSchemaClient,
  cditems: number[],
): Promise<CompatibleComboRuleRow[]> {
  const itemValues = integerList(cditems);
  if (!itemValues) {
    return [];
  }

  const schema = await getComboSchemaInfo(prisma);
  if (!schema.combo.cditem || !schema.combo.cdgru || !schema.combo.qtde) {
    return [];
  }

  const query = `
    SELECT
      ${
        schema.combo.autocod
          ? `${quoteIdentifier(schema.combo.autocod)}::int`
          : 'NULL::int'
      } AS "autocod",
      ${quoteIdentifier(schema.combo.cditem)}::int AS "cditem",
      ${quoteIdentifier(schema.combo.cdgru)}::int AS "cdgru",
      ${quoteIdentifier(schema.combo.qtde)} AS "qtde",
      ${
        schema.combo.createdat
          ? `${quoteIdentifier(schema.combo.createdat)}`
          : 'NULL::timestamp'
      } AS "createdat",
      ${
        schema.combo.updatedat
          ? `${quoteIdentifier(schema.combo.updatedat)}`
          : 'NULL::timestamp'
      } AS "updatedat"
    FROM t_itenscombo
    WHERE ${quoteIdentifier(schema.combo.cditem)} IN (${itemValues})
    ORDER BY
      ${quoteIdentifier(schema.combo.cditem)} ASC,
      ${quoteIdentifier(schema.combo.cdgru)} ASC
      ${
        schema.combo.autocod
          ? `, ${quoteIdentifier(schema.combo.autocod)} ASC`
          : ''
      }
  `;

  const rawRules = await prisma.$queryRawUnsafe<
    Array<{
      autocod: number | null;
      cditem: number | null;
      cdgru: number;
      qtde: unknown;
      createdat: Date | null;
      updatedat: Date | null;
    }>
  >(query);

  const subgroupRows = await listComboSubgroupsByIdentifiers(
    prisma,
    rawRules.map((rule) => rule.cdgru),
  );

  return rawRules.map((rule) => {
    const subgroup = matchSubgroupByComboIdentifier(subgroupRows, rule.cdgru);
    return {
      ...rule,
      subgroupAutocod: subgroup?.autocod ?? null,
      subgroupCdsub: subgroup?.cdsub ?? null,
      subgroupLabel: subgroup?.desub ?? null,
    };
  });
}

export async function resolveCompatibleComboSubgroup(
  prisma: TenantSchemaClient,
  subgroupIdentifier: number,
): Promise<CompatibleComboSubgroupRow | null> {
  if (!Number.isInteger(subgroupIdentifier) || subgroupIdentifier <= 0) {
    return null;
  }

  const rows = await listComboSubgroupsByIdentifiers(prisma, [subgroupIdentifier]);
  return matchSubgroupByComboIdentifier(rows, subgroupIdentifier);
}
