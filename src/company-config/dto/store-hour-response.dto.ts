export class StoreHourResponseDto {
  id: string | null = null;
  dayOfWeek: number | null = null;
  openTime: string | null = null;
  closeTime: string | null = null;
  isClosed = false;
  cdemp: number | null = null;
  companyId: string | null = null;
  companyCode: string | null = null;
}
