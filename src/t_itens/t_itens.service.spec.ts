import { TItensService } from './t_itens.service';
import { buildCompatibleScalarSelect } from '../lib/tenant-schema-compat';

jest.mock('../lib/tenant-schema-compat', () => ({
  buildCompatibleScalarSelect: jest.fn(),
}));

describe('TItensService image compatibility', () => {
  const mockedBuildCompatibleScalarSelect = jest.mocked(
    buildCompatibleScalarSelect,
  );

  const buildService = () => {
    const tenantDbService = {
      getTenantClient: jest.fn(),
    } as any;

    return new TItensService(tenantDbService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('interprets wildcard searches for item descriptions', () => {
    const service = buildService();

    expect((service as any).buildDescriptionFilter('%pack')).toEqual({
      endsWith: 'pack',
      mode: 'insensitive',
    });
    expect((service as any).buildDescriptionFilter('%pack%')).toEqual({
      contains: 'pack',
      mode: 'insensitive',
    });
    expect((service as any).buildDescriptionFilter('pack%')).toEqual({
      startsWith: 'pack',
      mode: 'insensitive',
    });
    expect((service as any).buildDescriptionFilter('pack')).toEqual({
      contains: 'pack',
      mode: 'insensitive',
    });
    expect(
      (service as any).buildDescriptionFilter('pack', {
        defaultMode: 'startsWith',
      }),
    ).toEqual({
      startsWith: 'pack',
      mode: 'insensitive',
    });
  });

  it('reads images without ordering by autocod when AUTOCOD is missing', async () => {
    mockedBuildCompatibleScalarSelect.mockResolvedValue({
      cditem: true,
      empitem: true,
      url: true,
    });

    const service = buildService();
    const prisma = {
      t_imgitens: {
        findMany: jest.fn().mockResolvedValue([
          {
            cditem: 10,
            empitem: 1,
            url: 'https://cdn/imagem.png',
          },
        ]),
      },
    } as any;

    const items = await (service as any).attachImages('tenant-a', prisma, [
      { cdemp: 1, cditem: 10, locfotitem: 'https://cdn/fallback.png' },
    ]);

    expect(prisma.t_imgitens.findMany).toHaveBeenCalledWith({
      where: {
        cditem: { in: [10] },
        empitem: { in: [1] },
      },
      select: {
        cditem: true,
        empitem: true,
        url: true,
      },
    });
    expect(items[0]?.t_imgitens).toEqual([
      {
        autocod: undefined,
        url: 'https://cdn/imagem.png',
      },
    ]);
  });

  it('skips t_imgitens writes when AUTOCOD is unavailable', async () => {
    mockedBuildCompatibleScalarSelect.mockResolvedValue({
      cditem: true,
      empitem: true,
      url: true,
    });

    const service = buildService();
    const prisma = {
      t_imgitens: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    await (service as any).ensurePrimaryImageRecord(
      'tenant-a',
      prisma,
      { cdemp: 1, cditem: 10 },
      'https://cdn/imagem.png',
    );

    expect(prisma.t_imgitens.findFirst).not.toHaveBeenCalled();
    expect(prisma.t_imgitens.create).not.toHaveBeenCalled();
  });
});
