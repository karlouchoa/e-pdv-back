import type { TenantClient } from './prisma-clients';
import { TenantPrisma } from './prisma-clients';

type TenantSchemaClient = Pick<TenantClient, '$queryRaw'>;

type DmmfField = {
  name: string;
  kind?: string;
  dbName?: string | null;
};

type DmmfModel = {
  name: string;
  dbName?: string | null;
  fields?: DmmfField[];
};

const scalarFieldColumnMapByModel = new Map<string, Map<string, string>>();
const tableNameByModel = new Map<string, string>();
type TableColumnsInfo = {
  exact: Set<string>;
  lower: Set<string>;
};

const incompatibleScalarFieldsByModel = new Map<string, Set<string>>([
  ['t_emp', new Set(['location'])],
  ['t_endcli', new Set(['location'])],
  ['t_itens', new Set(['isdeleted'])],
]);

const tableColumnsCache = new WeakMap<
  object,
  Map<string, Promise<TableColumnsInfo>>
>();

function getModelMetadata(modelName: string): DmmfModel | undefined {
  const models = ((TenantPrisma as any)?.dmmf?.datamodel?.models ??
    []) as DmmfModel[];
  return models.find((model) => model.name === modelName);
}

function getModelTableName(modelName: string): string {
  const cached = tableNameByModel.get(modelName);
  if (cached) {
    return cached;
  }

  const model = getModelMetadata(modelName);
  const tableName = model?.dbName ?? model?.name ?? modelName;
  tableNameByModel.set(modelName, tableName);
  return tableName;
}

function getScalarFieldColumnMap(modelName: string): Map<string, string> {
  const cached = scalarFieldColumnMapByModel.get(modelName);
  if (cached) {
    return cached;
  }

  const model = getModelMetadata(modelName);
  const map = new Map<string, string>();

  for (const field of model?.fields ?? []) {
    if (field.kind !== 'scalar') {
      continue;
    }

    map.set(field.name, field.dbName ?? field.name);
  }

  scalarFieldColumnMapByModel.set(modelName, map);
  return map;
}

function isIncompatibleScalarField(modelName: string, fieldName: string): boolean {
  return incompatibleScalarFieldsByModel
    .get(modelName)
    ?.has(fieldName) ?? false;
}

export async function getTenantTableColumns(
  prisma: TenantSchemaClient,
  modelName: string,
): Promise<TableColumnsInfo> {
  const cacheKey = prisma as object;
  let modelCache = tableColumnsCache.get(cacheKey);

  if (!modelCache) {
    modelCache = new Map<string, Promise<TableColumnsInfo>>();
    tableColumnsCache.set(cacheKey, modelCache);
  }

  const tableName = getModelTableName(modelName);
  const cacheEntryKey = tableName.toLowerCase();
  const cached = modelCache.get(cacheEntryKey);
  if (cached) {
    return cached;
  }

  const columnsPromise = prisma
    .$queryRaw<Array<{ column_name?: string | null }>>(
      TenantPrisma.sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER(${tableName})
      `,
    )
    .then(
      (rows) => {
        const exact = new Set<string>();
        const lower = new Set<string>();

        for (const column of rows
          .map((row) => row.column_name?.trim())
          .filter((value): value is string => Boolean(value))) {
          exact.add(column);
          lower.add(column.toLowerCase());
        }

        return { exact, lower };
      },
    );

  modelCache.set(cacheEntryKey, columnsPromise);
  return columnsPromise;
}

export async function buildCompatibleScalarSelect(
  prisma: TenantSchemaClient,
  modelName: string,
  requestedFields?: Iterable<string>,
): Promise<Record<string, true>> {
  const columns = await getTenantTableColumns(prisma, modelName);
  const fieldColumnMap = getScalarFieldColumnMap(modelName);
  const fields = requestedFields
    ? Array.from(requestedFields)
    : Array.from(fieldColumnMap.keys());

  const select: Record<string, true> = {};
  for (const fieldName of fields) {
    if (isIncompatibleScalarField(modelName, fieldName)) {
      continue;
    }

    const columnName = fieldColumnMap.get(fieldName);
    if (!columnName) {
      continue;
    }

    const requiresExactCase = columnName !== columnName.toLowerCase();
    const hasColumn = requiresExactCase
      ? columns.exact.has(columnName)
      : columns.lower.has(columnName.toLowerCase());

    if (!hasColumn) {
      continue;
    }
    select[fieldName] = true;
  }

  return select;
}

export async function filterCompatibleScalarData(
  prisma: TenantSchemaClient,
  modelName: string,
  data: Record<string, any>,
): Promise<Record<string, any>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const columns = await getTenantTableColumns(prisma, modelName);
  const fieldColumnMap = getScalarFieldColumnMap(modelName);

  return Object.fromEntries(
    Object.entries(data).filter(([fieldName]) => {
      if (isIncompatibleScalarField(modelName, fieldName)) {
        return false;
      }

      const columnName = fieldColumnMap.get(fieldName);
      if (!columnName) {
        return false;
      }

      const requiresExactCase = columnName !== columnName.toLowerCase();
      return requiresExactCase
        ? columns.exact.has(columnName)
        : columns.lower.has(columnName.toLowerCase());
    }),
  );
}

export async function modelHasCompatibleScalarField(
  prisma: TenantSchemaClient,
  modelName: string,
  fieldName: string,
): Promise<boolean> {
  const select = await buildCompatibleScalarSelect(prisma, modelName, [
    fieldName,
  ]);
  return Boolean(select[fieldName]);
}
