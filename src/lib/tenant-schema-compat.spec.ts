import { buildCompatibleScalarSelect } from './tenant-schema-compat';

describe('tenant-schema-compat', () => {
  it('excludes incompatible scalar fields even when the column exists', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        { column_name: 'cditem' },
        { column_name: 'cdemp' },
        { column_name: 'deitem' },
        { column_name: 'isdeleted' },
      ]),
    } as any;

    const select = await buildCompatibleScalarSelect(prisma, 't_itens', [
      'cditem',
      'cdemp',
      'deitem',
      'isdeleted',
    ]);

    expect(select).toEqual({
      cditem: true,
      cdemp: true,
      deitem: true,
    });
  });
});
