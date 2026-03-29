import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CashierReportQueryDto,
  DashboardRevenueByCategoryQueryDto,
  DashboardRevenueMonthlyQueryDto,
} from './admin-operations.dto';

describe('AdminOperations referenceDate validation', () => {
  it('accepts date-only referenceDate and transforms numeric query values', () => {
    const dto = plainToInstance(DashboardRevenueByCategoryQueryDto, {
      referenceDate: '2026-03-28',
      limit: '8',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(8);
    expect(dto.referenceDate).toBe('2026-03-28');
  });

  it('accepts referenceDate with surrounding whitespace', () => {
    const dto = plainToInstance(DashboardRevenueMonthlyQueryDto, {
      referenceDate: ' 2026-03-28 ',
      months: '12',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.referenceDate).toBe('2026-03-28');
    expect(dto.months).toBe(12);
  });

  it('rejects an invalid referenceDate consistently across dashboard queries', () => {
    const dailyDto = plainToInstance(DashboardRevenueByCategoryQueryDto, {
      referenceDate: '2026-99-99',
    });
    const monthlyDto = plainToInstance(DashboardRevenueMonthlyQueryDto, {
      referenceDate: 'not-a-date',
    });
    const cashierDto = plainToInstance(CashierReportQueryDto, {
      referenceDate: '2026-13-40',
    });

    const dailyErrors = validateSync(dailyDto);
    const monthlyErrors = validateSync(monthlyDto);
    const cashierErrors = validateSync(cashierDto);

    expect(dailyErrors[0]?.constraints).toHaveProperty(
      'isReferenceDateInput',
    );
    expect(monthlyErrors[0]?.constraints).toHaveProperty(
      'isReferenceDateInput',
    );
    expect(cashierErrors[0]?.constraints).toHaveProperty(
      'isReferenceDateInput',
    );
  });
});
