import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PublicTenantProvisionService } from './public-tenant-provision.service';
import type { ProvisionTenantDto } from './dto/provision-tenant.dto';

describe('PublicTenantProvisionService', () => {
  const basePayload: ProvisionTenantDto = {
    cnpj: '08.703.843/0001-66',
    inscricaoEstadual: 'ISENTO',
    nomeFantasia: 'Baratao do Dia',
    razaoSocial: 'EMPRESA TESTE LTDA',
    apelido: 'BARATAO',
    endereco: 'Av. Djalma Batista',
    numero: '432',
    bairro: 'Nossa Senhora das Gracas',
    cidade: 'Manaus',
    uf: 'AM',
    cep: '69053000',
    complemento: 'Sala 01',
    contatoNome: 'ADMINISTRADOR',
    contatoTelefone: '92981630344',
    whatsapp: '92981630344',
    ddd: '92',
    email: 'admin@baratao.com',
    emailConfirmacao: 'admin@baratao.com',
    site: 'https://baratao.com',
    usuarioLogin: 'ADM',
    usuarioNome: 'ADMINISTRADOR',
    senha: '1234',
    confirmarSenha: '1234',
    usuarioAdm: 'S',
    usuarioAtivo: 'S',
    certificadoCaminhoPfx: 'C:/certs/empresa.pfx',
    certificadoSenha: 'cert123',
    certificadoNumeroSerie: 'SERIE-001',
    cscId: '1',
    cscToken: 'TOKEN-CSC',
    ultimaNfe: 0,
    serieNfe: 1,
    ultimaNfce: 0,
    serieNfce: 1,
    regimeFiscalTipo: 'Simples Nacional',
    crt: 'crtSimplesNacional',
    subdominioPreferido: '',
    funcaoAcesso: 'adm',
    logoUrl: 'https://cdn.example.com/logo.png',
    imagemCapaUrl: 'https://cdn.example.com/capa.png',
    taxaEntrega: 5,
  };

  const buildService = () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'PROVISION_API_KEY') return 'test-key';
        if (key === 'PROVISION_HASH_PASSWORDS') return 'false';
        return undefined;
      }),
    };

    return new PublicTenantProvisionService(configService as any);
  };

  it('provisionamento feliz retorna sucesso e executa etapas principais', async () => {
    const service = buildService();
    const lockClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service as any, 'createMainSessionClient')
      .mockReturnValue(lockClient as any);
    const acquireSpy = jest
      .spyOn(service as any, 'acquireProvisionLock')
      .mockResolvedValue(undefined);
    const releaseSpy = jest
      .spyOn(service as any, 'releaseProvisionLock')
      .mockResolvedValue(undefined);
    const assertLoginSpy = jest
      .spyOn(service as any, 'assertLoginUniqueness')
      .mockResolvedValue(undefined);
    const resolveDatabaseNameSpy = jest
      .spyOn(service as any, 'resolveDatabaseName')
      .mockResolvedValue('barataododia');
    const assertSubdomainSpy = jest
      .spyOn(service as any, 'assertSubdomainUniqueness')
      .mockResolvedValue(undefined);
    const createDatabaseSpy = jest
      .spyOn(service as any, 'createTenantDatabase')
      .mockResolvedValue(undefined);
    const seedTenantSpy = jest
      .spyOn(service as any, 'seedTenantDatabase')
      .mockResolvedValue(undefined);
    const insertAcessoSpy = jest
      .spyOn(service as any, 'insertAcessoRecord')
      .mockResolvedValue(undefined);

    const result = await service.provision(basePayload, {
      provisionKey: 'test-key',
      correlationId: 'cid-1',
    });

    expect(result).toEqual({
      banco: 'barataododia',
      subdominio: 'barataododia',
      cnpj: '08703843000166',
      usuario: {
        cdusu: 'ADM',
        email: 'admin@baratao.com',
      },
      status: 'PROVISIONED',
      correlationId: 'cid-1',
    });

    expect(lockClient.$connect).toHaveBeenCalledTimes(1);
    expect(lockClient.$disconnect).toHaveBeenCalledTimes(1);
    expect(acquireSpy).toHaveBeenCalledWith(lockClient, '08703843000166');
    expect(releaseSpy).toHaveBeenCalledWith(lockClient, '08703843000166');
    expect(assertLoginSpy).toHaveBeenCalled();
    expect(resolveDatabaseNameSpy).toHaveBeenCalled();
    expect(assertSubdomainSpy).toHaveBeenCalledWith(lockClient, 'barataododia');
    expect(createDatabaseSpy).toHaveBeenCalledWith(lockClient, 'barataododia');
    expect(seedTenantSpy).toHaveBeenCalledWith(
      'barataododia',
      expect.any(Object),
      '1234',
    );
    expect(insertAcessoSpy).toHaveBeenCalledWith(
      lockClient,
      'barataododia',
      'barataododia',
      expect.any(Object),
      '1234',
    );
  });

  it('aplica sufixo de 3 digitos do CNPJ quando nome base do banco colide', async () => {
    const service = buildService();

    jest
      .spyOn(service as any, 'databaseExists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const resolved = await (service as any).resolveDatabaseName(
      {} as any,
      'barataododia',
      '087',
    );

    expect(resolved).toBe('barataododia087');
  });

  it('retorna 409 quando tambem existe colisao apos aplicar sufixo do CNPJ', async () => {
    const service = buildService();

    jest
      .spyOn(service as any, 'databaseExists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      (service as any).resolveDatabaseName({} as any, 'barataododia', '087'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('falha no passo tenant e executa compensacao com drop database', async () => {
    const service = buildService();
    const lockClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service as any, 'createMainSessionClient')
      .mockReturnValue(lockClient as any);
    jest
      .spyOn(service as any, 'acquireProvisionLock')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'releaseProvisionLock')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'assertLoginUniqueness')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'resolveDatabaseName')
      .mockResolvedValue('barataododia');
    jest
      .spyOn(service as any, 'assertSubdomainUniqueness')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'createTenantDatabase')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'seedTenantDatabase')
      .mockRejectedValue(new Error('seed failed'));
    const dropSpy = jest
      .spyOn(service as any, 'dropTenantDatabase')
      .mockResolvedValue(undefined);

    await expect(
      service.provision(basePayload, {
        provisionKey: 'test-key',
        correlationId: 'cid-seed-fail',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(dropSpy).toHaveBeenCalledWith(lockClient, 'barataododia');
  });

  it('falha ao inserir em t_acessos e executa compensacao com drop database', async () => {
    const service = buildService();
    const lockClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service as any, 'createMainSessionClient')
      .mockReturnValue(lockClient as any);
    jest
      .spyOn(service as any, 'acquireProvisionLock')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'releaseProvisionLock')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'assertLoginUniqueness')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'resolveDatabaseName')
      .mockResolvedValue('barataododia');
    jest
      .spyOn(service as any, 'assertSubdomainUniqueness')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'createTenantDatabase')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'seedTenantDatabase')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'insertAcessoRecord')
      .mockRejectedValue(new Error('t_acessos failed'));
    const dropSpy = jest
      .spyOn(service as any, 'dropTenantDatabase')
      .mockResolvedValue(undefined);

    await expect(
      service.provision(basePayload, {
        provisionKey: 'test-key',
        correlationId: 'cid-acessos-fail',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(dropSpy).toHaveBeenCalledWith(lockClient, 'barataododia');
  });

  it('concorrencia com mesmo CNPJ cria apenas um tenant', async () => {
    const service = buildService();

    const clients: any[] = [];
    jest.spyOn(service as any, 'createMainSessionClient').mockImplementation(() => {
      const client = {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      };
      clients.push(client);
      return client;
    });

    let locked = false;
    const waiters: Array<() => void> = [];
    jest
      .spyOn(service as any, 'acquireProvisionLock')
      .mockImplementation(async () => {
        if (locked) {
          await new Promise<void>((resolve) => waiters.push(resolve));
        }
        locked = true;
      });
    jest
      .spyOn(service as any, 'releaseProvisionLock')
      .mockImplementation(async () => {
        locked = false;
        const next = waiters.shift();
        if (next) next();
      });

    let loginInserted = false;
    jest
      .spyOn(service as any, 'assertLoginUniqueness')
      .mockImplementation(async () => {
        if (loginInserted) {
          throw new ConflictException(
            'Ja existe tenant provisionado para login admin@baratao.com.',
          );
        }
      });
    jest
      .spyOn(service as any, 'resolveDatabaseName')
      .mockResolvedValue('barataododia');
    jest
      .spyOn(service as any, 'assertSubdomainUniqueness')
      .mockResolvedValue(undefined);
    const createDatabaseSpy = jest
      .spyOn(service as any, 'createTenantDatabase')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'seedTenantDatabase')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'insertAcessoRecord')
      .mockImplementation(async () => {
        loginInserted = true;
      });

    const req1 = service.provision(basePayload, {
      provisionKey: 'test-key',
      correlationId: 'cid-conc-1',
    });
    const req2 = service.provision(basePayload, {
      provisionKey: 'test-key',
      correlationId: 'cid-conc-2',
    });

    const [r1, r2] = await Promise.allSettled([req1, req2]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('rejected');
    expect(createDatabaseSpy).toHaveBeenCalledTimes(1);
    expect(clients).toHaveLength(2);
  });
});
