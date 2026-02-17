import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import type {
  CashierAnalyticReportData,
  CashierSyntheticReportData,
} from './cashier-reports.types';

type PdfDocument = PDFKit.PDFDocument;

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

@Injectable()
export class CashierReportsPdfService {
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  async createSyntheticPdf(
    report: CashierSyntheticReportData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 34 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderSyntheticHeader(doc, report);
      this.renderSyntheticTable(doc, report);
      this.renderSyntheticFooter(doc, report);

      doc.end();
    });
  }

  async createAnalyticPdf(report: CashierAnalyticReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 34 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderAnalyticHeader(doc, report);
      this.renderAnalyticTable(doc, report);
      this.renderAnalyticFooter(doc, report);

      doc.end();
    });
  }

  private renderSyntheticHeader(
    doc: PdfDocument,
    report: CashierSyntheticReportData,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#111111')
      .text('Relatorio sintetico de fechamento de caixa');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
    doc.text(
      `Empresa: ${report.meta.companyName} (cdemp ${report.meta.companyId})`,
    );
    doc.text(
      `Caixa: ${report.meta.cashierId} | Usuario: ${report.meta.cashierUserCode}`,
    );
    doc.text(
      `Abertura: ${this.formatDateTime(report.meta.openedAt)} | Fechamento: ${this.formatDateTime(report.meta.closedAt)}`,
    );
    doc.text(
      `Mes referencia: ${this.formatDateOnly(report.meta.monthStart)} a ${this.formatDateOnly(report.meta.monthEnd)} | Gerado em: ${this.formatDateTime(report.meta.generatedAt)}`,
    );
    if (report.permissions.restrictedColumnsHidden) {
      doc.moveDown(0.2);
      doc
        .font('Helvetica-Bold')
        .fillColor('#991b1b')
        .text(
          'Aviso: totais de "ate dia anterior" e "acumulado" estao ocultos para este nivel de acesso.',
        );
    }
    doc.moveDown(0.6);
  }

  private renderSyntheticTable(
    doc: PdfDocument,
    report: CashierSyntheticReportData,
  ) {
    const columns: TableColumn[] = [
      { label: 'Tipo pagamento', width: 160, align: 'left' },
      { label: 'Total caixa', width: 80, align: 'right' },
      { label: 'Ate dia ant.', width: 88, align: 'right' },
      { label: 'Total hoje', width: 88, align: 'right' },
      { label: 'Acumulado', width: 88, align: 'right' },
    ];

    const rowHeight = 18;
    this.drawTableHeader(doc, columns, rowHeight);

    for (const row of report.rows) {
      this.ensureSpace(doc, rowHeight + 4);
      const values = [
        row.paymentType,
        this.formatCurrency(row.totalCashier),
        row.totalUntilPreviousDay === null
          ? '***'
          : this.formatCurrency(row.totalUntilPreviousDay),
        this.formatCurrency(row.totalToday),
        row.totalAccumulated === null
          ? '***'
          : this.formatCurrency(row.totalAccumulated),
      ];
      this.drawTableRow(doc, columns, values, rowHeight);
    }

    this.ensureSpace(doc, rowHeight + 8);
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold');
    this.drawTableRow(
      doc,
      columns,
      [
        'TOTAL',
        this.formatCurrency(report.footer.sumTotalCashier),
        report.footer.sumTotalUntilPreviousDay === null
          ? '***'
          : this.formatCurrency(report.footer.sumTotalUntilPreviousDay),
        this.formatCurrency(report.footer.sumTotalToday),
        report.footer.sumTotalAccumulated === null
          ? '***'
          : this.formatCurrency(report.footer.sumTotalAccumulated),
      ],
      rowHeight,
    );
    doc.font('Helvetica');
    doc.moveDown(0.4);
  }

  private renderSyntheticFooter(
    doc: PdfDocument,
    report: CashierSyntheticReportData,
  ) {
    const lines: Array<[string, number]> = [
      ['Saldo de abertura', report.footer.openingBalance],
      ['Total retiradas', report.footer.withdrawalsTotal],
      ['Total suprimentos', report.footer.suppliesTotal],
      ['Total dinheiro do caixa', report.footer.cashInDrawerTotal],
      ['Total vendas do caixa', report.footer.totalSales],
      ['Saldo fechamento calculado', report.footer.closingBalance],
    ];

    const startX = doc.page.margins.left;
    const width = this.contentWidth(doc);
    this.ensureSpace(doc, 20 + lines.length * 18 + 20);

    doc
      .lineWidth(1)
      .roundedRect(startX, doc.y, width, 24 + lines.length * 16, 5)
      .stroke('#111111');
    const top = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#111111')
      .text('Resumo financeiro do fechamento', startX + 10, top + 7);

    let y = top + 26;
    doc.font('Helvetica').fontSize(10).fillColor('#111111');
    for (const [label, value] of lines) {
      doc.text(label, startX + 10, y, { width: width - 140, align: 'left' });
      doc.text(this.formatCurrency(value), startX + width - 120, y, {
        width: 110,
        align: 'right',
      });
      y += 15;
    }

    doc.y = top + 30 + lines.length * 16;
  }

  private renderAnalyticHeader(
    doc: PdfDocument,
    report: CashierAnalyticReportData,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#111111')
      .text('Relatorio analitico de fechamento de caixa');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
    doc.text(
      `Empresa: ${report.meta.companyName} (cdemp ${report.meta.companyId})`,
    );
    doc.text(
      `Caixa: ${report.meta.cashierId} | Usuario: ${report.meta.cashierUserCode}`,
    );
    doc.text(
      `Abertura: ${this.formatDateTime(report.meta.openedAt)} | Fechamento: ${this.formatDateTime(report.meta.closedAt)} | Gerado em: ${this.formatDateTime(report.meta.generatedAt)}`,
    );
    doc.moveDown(0.6);
  }

  private renderAnalyticTable(
    doc: PdfDocument,
    report: CashierAnalyticReportData,
  ) {
    const columns: TableColumn[] = [
      { label: 'Pedido', width: 55, align: 'right' },
      { label: 'Data/Hora', width: 90, align: 'left' },
      { label: 'Cliente', width: 165, align: 'left' },
      { label: 'Tipo pagamento', width: 135, align: 'left' },
      { label: 'Valor', width: 78, align: 'right' },
    ];

    const rowHeight = 18;
    this.drawTableHeader(doc, columns, rowHeight);

    for (const order of report.orders) {
      if (!order.payments.length) {
        this.ensureSpace(doc, rowHeight + 4);
        this.drawTableRow(
          doc,
          columns,
          [
            String(order.nrven),
            this.formatDateTime(order.issuedAt),
            order.customerName ?? 'Cliente',
            '-',
            this.formatCurrency(0),
          ],
          rowHeight,
        );
        continue;
      }

      order.payments.forEach((payment, index) => {
        this.ensureSpace(doc, rowHeight + 4);
        this.drawTableRow(
          doc,
          columns,
          [
            index === 0 ? String(order.nrven) : '',
            index === 0 ? this.formatDateTime(order.issuedAt) : '',
            index === 0 ? (order.customerName ?? 'Cliente') : '',
            payment.paymentType,
            this.formatCurrency(payment.value),
          ],
          rowHeight,
        );
      });
    }

    doc.moveDown(0.4);
  }

  private renderAnalyticFooter(
    doc: PdfDocument,
    report: CashierAnalyticReportData,
  ) {
    this.ensureSpace(doc, 70);
    const startX = doc.page.margins.left;
    const width = this.contentWidth(doc);
    const top = doc.y;

    doc.lineWidth(1).roundedRect(startX, top, width, 52, 5).stroke('#111111');

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111');
    doc.text('Totais do relatorio', startX + 10, top + 8);

    doc.font('Helvetica').fontSize(10);
    doc.text(
      `Pedidos efetivados: ${report.summary.ordersCount}`,
      startX + 10,
      top + 26,
    );
    doc.text(
      `Total vendas: ${this.formatCurrency(report.summary.totalSale)}`,
      startX + 220,
      top + 26,
    );
    doc.text(
      `Total recebido: ${this.formatCurrency(report.summary.totalPaid)}`,
      startX + 380,
      top + 26,
    );
    doc.y = top + 58;
  }

  private drawTableHeader(
    doc: PdfDocument,
    columns: TableColumn[],
    rowHeight: number,
  ) {
    this.ensureSpace(doc, rowHeight + 6);
    const startX = doc.page.margins.left;
    const top = doc.y;

    doc.save();
    doc.rect(startX, top, this.contentWidth(doc), rowHeight).fill('#f3f4f6');
    doc.restore();

    let x = startX;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111');
    for (const column of columns) {
      doc.text(column.label, x + 5, top + 5, {
        width: column.width - 10,
        align: column.align ?? 'left',
      });
      x += column.width;
    }

    doc
      .moveTo(startX, top + rowHeight)
      .lineTo(startX + this.contentWidth(doc), top + rowHeight)
      .stroke('#d1d5db');
    doc.y = top + rowHeight;
    doc.font('Helvetica').fontSize(9).fillColor('#111111');
  }

  private drawTableRow(
    doc: PdfDocument,
    columns: TableColumn[],
    values: string[],
    rowHeight: number,
  ) {
    const startX = doc.page.margins.left;
    const top = doc.y;

    let x = startX;
    for (let i = 0; i < columns.length; i += 1) {
      const column = columns[i];
      doc.text(values[i] ?? '', x + 5, top + 4, {
        width: column.width - 10,
        align: column.align ?? 'left',
      });
      x += column.width;
    }

    doc
      .moveTo(startX, top + rowHeight)
      .lineTo(startX + this.contentWidth(doc), top + rowHeight)
      .stroke('#e5e7eb');
    doc.y = top + rowHeight;
  }

  private contentWidth(doc: PdfDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private ensureSpace(doc: PdfDocument, neededHeight: number) {
    const maxY = doc.page.height - doc.page.margins.bottom;
    if (doc.y + neededHeight > maxY) {
      doc.addPage();
    }
  }

  private formatCurrency(value: number): string {
    return this.currencyFormatter.format(Number.isFinite(value) ? value : 0);
  }

  private formatDateOnly(value: Date): string {
    return value.toLocaleDateString('pt-BR');
  }

  private formatDateTime(value: Date | null): string {
    if (!value) return '-';
    return this.dateFormatter.format(value);
  }
}
