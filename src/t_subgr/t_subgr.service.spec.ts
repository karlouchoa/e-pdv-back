import { TSubgrService } from './t_subgr.service';
import {
  buildCompatibleScalarSelect,
  filterCompatibleScalarData,
} from '../lib/tenant-schema-compat';

jest.mock('../lib/tenant-schema-compat', () => ({
  buildCompatibleScalarSelect: jest.fn(),
  filterCompatibleScalarData: jest.fn(),
}));

describe('TSubgrService compatibility', () => {
  const mockedBuildCompatibleScalarSelect = jest.mocked(
    buildCompatibleScalarSelect,
  );
  const mockedFilterCompatibleScalarData = jest.mocked(
    filterCompatibleScalarData,
  );

  const buildService = () => {
    const prisma = {
      t_gritens: {
        findUnique: jest.fn().mockResolvedValue({ cdgru: 1 }),
      },
      t_subgr: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ cdsub: 1, cdgru: 1, desub: 'A' }),
      },
    };

    const tenantDbService = {
      getTenantClient: jest.fn().mockResolvedValue(prisma),
    } as any;

    return {
      service: new TSubgrService(tenantDbService),
      prisma,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBuildCompatibleScalarSelect.mockResolvedValue({
      cdsub: true,
      cdgru: true,
      desub: true,
    });
    mockedFilterCompatibleScalarData.mockImplementation(async (_prisma, _model, data) => data);
  });

  it('uses compatible select in findAll', async () => {
    const { service, prisma } = buildService();

    await service.findAll('tenant-a', { cdgru: '1', iniciais: 'PA' });

    expect(prisma.t_subgr.findMany).toHaveBeenCalledWith({
      where: {
        cdgru: 1,
        desub: { startsWith: 'PA' },
      },
      orderBy: [{ cdgru: 'asc' }, { cdsub: 'asc' }],
      select: {
        cdsub: true,
        cdgru: true,
        desub: true,
      },
    });
  });

  it('filters create data through compatible schema helper', async () => {
    const { service, prisma } = buildService();

    await service.create('tenant-a', {
      cdgru: 1,
      desub: 'PACK',
      idsugr: 'P01',
      oldcod: '1',
      cdsubext: 7,
    });

    expect(mockedFilterCompatibleScalarData).toHaveBeenCalled();
    expect(prisma.t_subgr.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cdgru: 1,
        desub: 'PACK',
      }),
      select: {
        cdsub: true,
        cdgru: true,
        desub: true,
      },
    });
  });
});
