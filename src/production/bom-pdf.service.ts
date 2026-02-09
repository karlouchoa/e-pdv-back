import { Injectable } from '@nestjs/common';
// import PDFDocument from 'pdfkit';
// import type PDFKit from 'pdfkit';
import PDFDocument = require('pdfkit');
type PDFKit = PDFKit.PDFDocument; // se precisar do tipo

import type { Prisma } from '../../prisma/generated/client_tenant';

type PrismaBomWithItems = Prisma.bom_headersGetPayload<{
  include: { bom_items: true };
}>;

type BomWithItems = Omit<PrismaBomWithItems, 'bom_items'> & {
  items: PrismaBomWithItems['bom_items'];
  product_description?: string | null;
};

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  value: (item: BomWithItems['items'][number], index: number) => string;
}

@Injectable()
export class BomPdfService {
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  private readonly decimalFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  async createBomPdf(bom: BomWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, bom);
      this.renderMetadata(doc, bom);
      this.renderItemsTable(doc, bom);
      this.renderTotals(doc, bom);

      doc.end();
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, bom: BomWithItems) {
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#111827')
      .text('Ficha técnica de produção', {
        width: this.contentWidth(doc),
      });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#6b7280')
      .text(`Gerado em ${this.formatDate(bom.created_at)}`);

    const startX = doc.page.margins.left;
    const width = this.contentWidth(doc);

    doc
      .moveTo(startX, doc.y + 8)
      .lineTo(startX + width, doc.y + 8)
      .lineWidth(1)
      .strokeColor('#d1d5db')
      .stroke();

    doc.moveDown(1.2);
  }

  private renderMetadata(doc: PDFKit.PDFDocument, bom: BomWithItems) {
    const metadata = [
      {
        label: 'Produto a ser produzido',
        value: this.formatProduct(bom),
      },
      { label: 'Versao', value: bom.version },
      { label: 'Numero do lote', value: this.formatDecimal(bom.lot_size) },
      {
        label: 'Data da geracao do BOM',
        value: this.formatDate(bom.created_at),
      },
    ];

    metadata.forEach((item) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#6b7280')
        .text(item.label.toUpperCase(), {
          width: this.contentWidth(doc),
        });
      doc.font('Helvetica').fontSize(12).fillColor('#111827').text(item.value);
      doc.moveDown(0.3);
    });

    if (bom.notes) {
      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('OBSERVACOES', {
          width: this.contentWidth(doc),
        });
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#111827')
        .text(bom.notes, { width: this.contentWidth(doc) });
    }

    doc.moveDown();
  }

  private renderItemsTable(doc: PDFKit.PDFDocument, bom: BomWithItems) {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text('Materiais e custos previstos');

    doc.moveDown(0.4);

    if (!bom.items.length) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Nenhuma materia-prima cadastrada.');
      doc.moveDown();
      return;
    }

    const startX = doc.page.margins.left;
    const tableWidth = this.contentWidth(doc);
    const columns: TableColumn[] = [
      {
        label: 'Item',
        width: 40,
        align: 'center',
        value: (_item, index) => `${index + 1}`,
      },
      {
        label: 'Código',
        width: 80,
        value: (item) => item.component_code,
      },
      {
        label: 'Descrição',
        width: 150,
        value: (item) => item.description ?? '-',
      },
      {
        label: 'Quantidade',
        width: 70,
        align: 'right',
        value: (item) => this.formatDecimal(item.quantity),
      },
      {
        label: 'Custo unitário',
        width: 75,
        align: 'right',
        value: (item) => this.formatCurrency(item.unit_cost),
      },
      {
        label: 'Custo total',
        width: 80,
        align: 'right',
        value: (item) =>
          this.formatCurrency(
            this.toNumber(item.quantity) * this.toNumber(item.unit_cost),
          ),
      },
    ];

    const consumedWidth = columns.reduce((acc, col) => acc + col.width, 0);
    const delta = tableWidth - consumedWidth;
    if (Math.abs(delta) > 0.1) {
      columns[columns.length - 1].width += delta;
    }

    const headerHeight = 16;
    this.ensureSpace(doc, headerHeight + 4);

    const tableTop = doc.y;
    doc.save();

    doc
      .lineWidth(1)
      .roundedRect(startX, tableTop, tableWidth, headerHeight, 4)
      .fillAndStroke('#ffffff', '#000000'); // fundo branco, borda preta
    doc.restore();

    const columnOffsets = this.buildColumnOffsets(columns, startX);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');

    columns.forEach((col, index) => {
      doc.text(
        col.label.toUpperCase(),
        columnOffsets[index] + 6,
        tableTop + 4,
        {
          width: col.width - 12,
          align: 'center',
        },
      );
    });

    doc.y = tableTop + headerHeight;
    const rowHeight = 22;

    bom.items.forEach((item, index) => {
      this.ensureSpace(doc, rowHeight + 4);
      const rowTop = doc.y;

      if (index % 2 === 0) {
        doc.save();
        doc.rect(startX, rowTop, tableWidth, rowHeight).fill('#f3f4f6');
        doc.restore();
      }

      doc.font('Helvetica').fontSize(8).fillColor('#111827');
      columns.forEach((col, colIndex) => {
        const label = col.label.toLowerCase();
        const isItemColumn = label === 'item';
        const isCodigoColumn = label === 'código' || label === 'codigo';
        const isDescriptionColumn =
          label === 'descrição' || label === 'descricao';
        let align: 'left' | 'right' | 'center' = 'right';
        if (isDescriptionColumn) {
          align = 'left';
        } else if (isItemColumn || isCodigoColumn) {
          align = 'center';
        }
        doc.text(
          col.value(item, index),
          columnOffsets[colIndex] + 6,
          rowTop + 6,
          {
            width: col.width - 12,
            align: col.align ?? align,
          },
        );
      });

      doc.y = rowTop + rowHeight;
    });

    doc.moveDown();
  }

  private formatProduct(bom: BomWithItems) {
    return bom.product_description
      ? `${bom.product_code} - ${bom.product_description}`
      : bom.product_code;
  }

  private renderTotals(doc: PDFKit.PDFDocument, bom: BomWithItems) {
    const boxHeight = 60;
    this.ensureSpace(doc, boxHeight + 8);

    const startX = doc.page.margins.left;
    const boxWidth = this.contentWidth(doc);
    const top = doc.y;

    doc.save();
    doc
      .roundedRect(startX, top, boxWidth, boxHeight, 6)
      .fillAndStroke('#ffffff', '#000000');
    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text('Custos totais de produção', startX + 18, top + 14, {
        width: boxWidth - 36,
        align: 'right',
      });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#111827')
      .text(
        `Custo total do lote: ${this.formatCurrency(bom.total_cost)}`,
        startX + 18,
        top + 32,
        { width: boxWidth - 36, align: 'right' },
      );

    doc.text(
      `Custo unitário estimado: ${this.formatCurrency(bom.unit_cost)}`,
      startX + 18,
      top + 46,
      { width: boxWidth - 36, align: 'right' },
    );

    doc.y = top + boxHeight + 12;
  }

  private buildColumnOffsets(columns: TableColumn[], start: number) {
    const offsets: number[] = [];
    let current = start;

    columns.forEach((col) => {
      offsets.push(current);
      current += col.width;
    });

    return offsets;
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) {
      doc.addPage();
    }
  }

  private contentWidth(doc: PDFKit.PDFDocument) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private formatCurrency(value: Prisma.Decimal | number | null | undefined) {
    return this.currencyFormatter.format(this.toNumber(value));
  }

  private formatDecimal(value: Prisma.Decimal | number | null | undefined) {
    return this.decimalFormatter.format(this.toNumber(value));
  }

  private formatDate(value: Date) {
    return this.dateFormatter.format(value);
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value == null) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value);
  }
}
