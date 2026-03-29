import { BadRequestException } from '@nestjs/common';
import { GenericTenantService } from './generic-tenant.service';
import type { TenantTableConfig } from './tenant-table.config';

describe('GenericTenantService', () => {
  const config: TenantTableConfig = {
    name: 't_emp',
    primaryKeys: [{ name: 'cdemp', type: 'number' }],
  };

  const buildService = () => {
    const delegate = {
      findUnique: jest.fn().mockResolvedValue({ cdemp: 1 }),
      create: jest.fn().mockResolvedValue({ cdemp: 1 }),
      update: jest
        .fn()
        .mockResolvedValue({ cdemp: 1, latitude: -3.12, longitude: -60.02 }),
      delete: jest.fn().mockResolvedValue({ cdemp: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    };

    const prisma = {
      [config.name]: delegate,
      $queryRaw: jest.fn().mockImplementation((query: any) => {
        const sql = Array.isArray(query?.strings)
          ? query.strings.join(' ')
          : String(query);

        if (sql.includes('SELECT column_name')) {
          return Promise.resolve([
            { column_name: 'cdemp' },
            { column_name: 'deemp' },
            { column_name: 'cnpjemp' },
            { column_name: 'apelido' },
            { column_name: 'logonfe' },
            { column_name: 'imagem_capa' },
            { column_name: 'latitude' },
            { column_name: 'longitude' },
            { column_name: 'location' },
          ]);
        }

        if (sql.includes('SELECT 1 AS "hasLocation"')) {
          return Promise.resolve([{ hasLocation: 1 }]);
        }

        if (sql.includes('TABLE_SCHEMA AS "TABLE_SCHEMA"')) {
          return Promise.resolve([
            { TABLE_SCHEMA: 'dbo', TABLE_NAME: 't_emp' },
          ]);
        }

        return Promise.resolve([]);
      }),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    const mainPrisma = {
      t_acessos: {
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    const tenantDbService = {
      getTenantClient: jest.fn().mockResolvedValue(prisma),
      getMainClient: jest.fn().mockReturnValue(mainPrisma),
    } as any;

    const service = new GenericTenantService(config, tenantDbService);
    return { service, delegate, prisma, mainPrisma };
  };

  it('deve normalizar latitude/longitude e sincronizar o campo geography', async () => {
    const { service, delegate, prisma } = buildService();

    await service.update(
      'tenant-a',
      { cdemp: '1' },
      {
        deemp: 'EMPRESA TESTE',
        latitute: '-3,12',
        longitude: '-60.02',
        campoInvalido: 'x',
      },
    );

    expect(delegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cdemp: 1 },
        data: {
          deemp: 'EMPRESA TESTE',
          latitude: -3.12,
          longitude: -60.02,
        },
      }),
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('deve rejeitar create sem nenhum campo valido', async () => {
    const { service, delegate } = buildService();

    await expect(
      service.create('tenant-a', { campoInvalido: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(delegate.create).not.toHaveBeenCalled();
  });

  it('deve aceitar create apenas com coordenadas', async () => {
    const { service, delegate, prisma } = buildService();

    await service.create('tenant-a', {
      latitute: '-3.12121212',
      longitute: '-60.02020202',
    });

    expect(delegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          latitude: -3.12121212,
          longitude: -60.02020202,
        },
      }),
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('deve excluir o campo location do select da tabela de empresa', async () => {
    const { service, delegate } = buildService();

    await service.findOne('tenant-a', { cdemp: '1' });

    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { cdemp: 1 },
      select: expect.not.objectContaining({
        location: true,
      }),
    });
  });

  it('deve sincronizar logo/capa em t_acessos usando cnpj + apelido da empresa', async () => {
    const { service, delegate, mainPrisma } = buildService();
    delegate.update.mockResolvedValueOnce({
      cdemp: 1,
      logonfe: 'https://cdn/logo.png',
      imagem_capa: 'https://cdn/capa.png',
      cnpjemp: '11.222.333/0001-44 ',
      apelido: ' EMPRESA TESTE ',
    });
    mainPrisma.$queryRaw.mockResolvedValueOnce([{ id: 7 }]);

    await service.update(
      'tenant-a',
      { cdemp: '1' },
      {
        deemp: 'EMPRESA TESTE',
        logonfe: 'https://cdn/logo.png',
        imagem_capa: 'https://cdn/capa.png',
      },
    );

    expect(mainPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mainPrisma.t_acessos.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        logourl: 'https://cdn/logo.png',
        imagem_capa: 'https://cdn/capa.png',
      },
    });
  });

  it('nao deve sincronizar logo/capa se apelido nao estiver disponivel', async () => {
    const { service, delegate, mainPrisma } = buildService();
    delegate.update.mockResolvedValueOnce({
      cdemp: 1,
      logonfe: 'https://cdn/logo2.png',
      imagem_capa: 'https://cdn/capa2.png',
      cnpjemp: '11.222.333/0001-44',
      apelido: null,
    });

    await service.update(
      'tenant-a',
      { cdemp: '1' },
      {
        deemp: 'EMPRESA TESTE',
        logonfe: 'https://cdn/logo2.png',
        imagem_capa: 'https://cdn/capa2.png',
        cnpjemp: '11.222.333/0001-44',
      },
    );

    expect(mainPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(mainPrisma.t_acessos.update).not.toHaveBeenCalled();
  });
});
