import { resolve } from 'path';

type TenantPrismaModule = typeof import('../../prisma/generated/client_tenant');
type MainPrismaModule = typeof import('../../prisma/generated/client_main');

function requirePrismaModule<T>(
  moduleName: 'client_tenant' | 'client_main',
): T {
  const candidatePaths = [
    resolve(__dirname, '..', '..', 'prisma', 'generated', moduleName),
    resolve(__dirname, '..', 'prisma', 'generated', moduleName),
  ];

  for (const modulePath of candidatePaths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(modulePath) as T;
    } catch (error: any) {
      if (error?.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  throw new Error(
    `Prisma client module '${moduleName}' n\u00e3o encontrado nos caminhos esperados.`,
  );
}

const tenantPrismaModule = requirePrismaModule<TenantPrismaModule>(
  'client_tenant',
);

const mainPrismaModule = requirePrismaModule<MainPrismaModule>('client_main');

export const TenantPrisma = tenantPrismaModule.Prisma;
export { Prisma } from '@prisma/client';
export const TenantPrismaClient = tenantPrismaModule.PrismaClient;
export type TenantPrismaTypes = typeof TenantPrisma;
export type TenantClient = InstanceType<typeof TenantPrismaClient>;

export const MainPrisma = mainPrismaModule.Prisma;
export const MainPrismaClient = mainPrismaModule.PrismaClient;
export type MainPrismaTypes = typeof MainPrisma;
export type MainClient = InstanceType<typeof MainPrismaClient>;
