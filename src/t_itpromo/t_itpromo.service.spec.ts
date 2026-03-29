import { TItpromoService } from './t_itpromo.service';

describe('TItpromoService', () => {
  const buildService = () =>
    new TItpromoService({
      getTenantClient: jest.fn(),
      getTenantClientBySubdomain: jest.fn(),
    } as any);

  it('uses physical SQL column names for mixed-case promo fields', () => {
    const service = buildService() as any;

    expect(service.toSqlColumnName('CreatedAt')).toBe('"CreatedAt"');
    expect(service.toSqlColumnName('UpdatedAt')).toBe('"UpdatedAt"');
    expect(service.toSqlColumnName('DATA_PROMO')).toBe('"DATA_PROMO"');
    expect(service.toSqlColumnName('EMPITEM')).toBe('empitem');
  });
});
