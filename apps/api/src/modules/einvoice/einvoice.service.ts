import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  EInvoiceStatus,
  EInvoiceSubmissionResult,
  MyInvoisDocumentType,
  MyInvoisClassificationCode,
} from './dto/einvoice.dto';

interface MyInvoisConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tin: string;
  idType: string;
  idValue: string;
}

interface MyInvoisToken {
  accessToken: string;
  expiresAt: Date;
}

@Injectable()
export class EInvoiceService {
  private readonly logger = new Logger(EInvoiceService.name);
  private tokenCache: Map<string, MyInvoisToken> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // ============ MyInvois Configuration ============

  private getMyInvoisConfig(): MyInvoisConfig {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      baseUrl: isProduction
        ? 'https://api.myinvois.hasil.gov.my'
        : 'https://preprod-api.myinvois.hasil.gov.my',
      clientId: this.configService.get('MYINVOIS_CLIENT_ID', ''),
      clientSecret: this.configService.get('MYINVOIS_CLIENT_SECRET', ''),
      tin: this.configService.get('MYINVOIS_TIN', ''),
      idType: this.configService.get('MYINVOIS_ID_TYPE', 'BRN'),
      idValue: this.configService.get('MYINVOIS_ID_VALUE', ''),
    };
  }

  private async getAccessToken(organizationId: string): Promise<string> {
    // Check cache
    const cached = this.tokenCache.get(organizationId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.accessToken;
    }

    const config = this.getMyInvoisConfig();

    // In a real implementation, this would call the MyInvois OAuth endpoint
    // For now, we'll simulate the token acquisition
    const tokenResponse = await this.authenticateWithMyInvois(config);

    this.tokenCache.set(organizationId, {
      accessToken: tokenResponse.accessToken,
      expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000),
    });

    return tokenResponse.accessToken;
  }

  private async authenticateWithMyInvois(config: MyInvoisConfig): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    // In production, this would make an actual API call to MyInvois
    // POST /connect/token
    // with grant_type, client_id, client_secret, scope

    this.logger.log('Authenticating with MyInvois API...');

    // Simulated response for development
    return {
      accessToken: `myinvois_token_${Date.now()}`,
      expiresIn: 3600,
    };
  }

  // ============ e-Invoice Submission ============

  async submitInvoice(
    invoiceId: string,
    organizationId: string
  ): Promise<EInvoiceSubmissionResult> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: true },
        },
        organization: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.eInvoiceStatus === 'VALIDATED') {
      throw new BadRequestException('Invoice already validated');
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'VOID') {
      throw new BadRequestException('Cannot submit draft or void invoices');
    }

    // Generate e-Invoice document in UBL 2.1 format
    const documentPayload = await this.generateEInvoiceDocument(invoice);

    // Submit to MyInvois
    const submissionResult = await this.submitToMyInvois(
      organizationId,
      documentPayload
    );

    // Update invoice with submission details
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        eInvoiceId: submissionResult.submissionId,
        eInvoiceStatus: submissionResult.status,
        eInvoiceQrCode: submissionResult.qrCode,
      },
    });

    return {
      invoiceId,
      submissionId: submissionResult.submissionId,
      status: submissionResult.status,
      qrCode: submissionResult.qrCode,
      submittedAt: new Date(),
    };
  }

  async submitBulkInvoices(
    invoiceIds: string[],
    organizationId: string
  ): Promise<EInvoiceSubmissionResult[]> {
    const results: EInvoiceSubmissionResult[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.submitInvoice(invoiceId, organizationId);
        results.push(result);
      } catch (error) {
        results.push({
          invoiceId,
          submissionId: '',
          status: EInvoiceStatus.REJECTED,
          validationErrors: [error.message],
        });
      }
    }

    return results;
  }

  private async generateEInvoiceDocument(invoice: any): Promise<any> {
    // Generate UBL 2.1 XML document for MyInvois
    const document = {
      _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      Invoice: [
        {
          ID: [{ _: invoice.invoiceNumber }],
          IssueDate: [{ _: invoice.invoiceDate.toISOString().split('T')[0] }],
          IssueTime: [{ _: invoice.invoiceDate.toISOString().split('T')[1].split('.')[0] }],
          InvoiceTypeCode: [
            {
              _: MyInvoisDocumentType.INVOICE,
              listVersionID: '1.0',
            },
          ],
          DocumentCurrencyCode: [{ _: 'MYR' }],
          TaxCurrencyCode: [{ _: 'MYR' }],
          AccountingSupplierParty: [
            {
              Party: [
                {
                  PartyIdentification: [
                    {
                      ID: [
                        {
                          _: invoice.organization.tin || invoice.organization.businessRegNo,
                          schemeID: invoice.organization.tin ? 'TIN' : 'BRN',
                        },
                      ],
                    },
                  ],
                  PartyLegalEntity: [
                    {
                      RegistrationName: [{ _: invoice.organization.name }],
                    },
                  ],
                },
              ],
            },
          ],
          AccountingCustomerParty: [
            {
              Party: [
                {
                  PartyIdentification: [
                    {
                      ID: [
                        {
                          _: invoice.customer.taxNumber || invoice.customer.companyName,
                          schemeID: invoice.customer.taxNumber ? 'TIN' : 'BRN',
                        },
                      ],
                    },
                  ],
                  PartyLegalEntity: [
                    {
                      RegistrationName: [{ _: invoice.customer.displayName }],
                    },
                  ],
                },
              ],
            },
          ],
          LegalMonetaryTotal: [
            {
              LineExtensionAmount: [
                { _: Number(invoice.subtotal).toFixed(2), currencyID: 'MYR' },
              ],
              TaxExclusiveAmount: [
                { _: Number(invoice.subtotal).toFixed(2), currencyID: 'MYR' },
              ],
              TaxInclusiveAmount: [
                { _: Number(invoice.total).toFixed(2), currencyID: 'MYR' },
              ],
              PayableAmount: [
                { _: Number(invoice.balance).toFixed(2), currencyID: 'MYR' },
              ],
            },
          ],
          TaxTotal: [
            {
              TaxAmount: [
                { _: Number(invoice.taxAmount).toFixed(2), currencyID: 'MYR' },
              ],
              TaxSubtotal: [
                {
                  TaxableAmount: [
                    { _: Number(invoice.subtotal).toFixed(2), currencyID: 'MYR' },
                  ],
                  TaxAmount: [
                    { _: Number(invoice.taxAmount).toFixed(2), currencyID: 'MYR' },
                  ],
                  TaxCategory: [
                    {
                      ID: [{ _: '01' }], // Standard rate
                      Percent: [{ _: '10' }], // SST 10%
                      TaxScheme: [
                        {
                          ID: [
                            { _: 'OTH', schemeID: 'UN/ECE 5153', schemeAgencyID: '6' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          InvoiceLine: invoice.items.map((item: any, index: number) => ({
            ID: [{ _: String(index + 1) }],
            InvoicedQuantity: [
              { _: Number(item.quantity).toFixed(2), unitCode: 'C62' },
            ],
            LineExtensionAmount: [
              { _: Number(item.amount).toFixed(2), currencyID: 'MYR' },
            ],
            TaxTotal: [
              {
                TaxAmount: [
                  { _: Number(item.taxAmount).toFixed(2), currencyID: 'MYR' },
                ],
              },
            ],
            Item: [
              {
                Description: [{ _: item.description || item.item?.name || '' }],
                CommodityClassification: [
                  {
                    ItemClassificationCode: [
                      {
                        _: MyInvoisClassificationCode.GOODS,
                        listID: 'CLASS',
                      },
                    ],
                  },
                ],
              },
            ],
            Price: [
              {
                PriceAmount: [
                  { _: Number(item.rate).toFixed(2), currencyID: 'MYR' },
                ],
              },
            ],
          })),
        },
      ],
    };

    return document;
  }

  private async submitToMyInvois(
    organizationId: string,
    document: any
  ): Promise<{
    submissionId: string;
    status: EInvoiceStatus;
    qrCode?: string;
  }> {
    const accessToken = await this.getAccessToken(organizationId);
    const config = this.getMyInvoisConfig();

    // In production, this would make an actual API call to MyInvois
    // POST /api/v1.0/documentsubmissions

    this.logger.log(`Submitting e-Invoice to MyInvois (${config.baseUrl})...`);

    // Simulated successful response
    const submissionId = `EINV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const qrCode = `https://myinvois.hasil.gov.my/validate/${submissionId}`;

    return {
      submissionId,
      status: EInvoiceStatus.VALIDATED,
      qrCode,
    };
  }

  // ============ e-Invoice Status & Queries ============

  async getSubmissionStatus(
    invoiceId: string,
    organizationId: string
  ): Promise<{ status: EInvoiceStatus; details?: any }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: {
        id: true,
        eInvoiceId: true,
        eInvoiceStatus: true,
        eInvoiceQrCode: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.eInvoiceId) {
      return { status: EInvoiceStatus.PENDING };
    }

    // In production, would query MyInvois for latest status
    return {
      status: invoice.eInvoiceStatus as EInvoiceStatus || EInvoiceStatus.PENDING,
      details: {
        submissionId: invoice.eInvoiceId,
        qrCode: invoice.eInvoiceQrCode,
      },
    };
  }

  async cancelSubmission(
    invoiceId: string,
    organizationId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.eInvoiceId) {
      throw new BadRequestException('Invoice has not been submitted');
    }

    if (invoice.eInvoiceStatus === 'CANCELLED') {
      throw new BadRequestException('e-Invoice already cancelled');
    }

    // In production, would call MyInvois cancellation API
    this.logger.log(`Cancelling e-Invoice ${invoice.eInvoiceId}: ${reason}`);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { eInvoiceStatus: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'e-Invoice cancellation submitted',
    };
  }

  // ============ Reporting ============

  async getSubmissionReport(
    organizationId: string,
    fromDate: Date,
    toDate: Date
  ) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: fromDate, lte: toDate },
        eInvoiceId: { not: null },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        total: true,
        eInvoiceId: true,
        eInvoiceStatus: true,
        customer: { select: { displayName: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const statusCounts = invoices.reduce(
      (acc, inv) => {
        const status = inv.eInvoiceStatus || 'PENDING';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      period: { fromDate, toDate },
      totalSubmissions: invoices.length,
      statusSummary: statusCounts,
      submissions: invoices,
    };
  }

  async getPendingSubmissions(organizationId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
        eInvoiceId: null,
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        total: true,
        customer: { select: { displayName: true } },
      },
      orderBy: { invoiceDate: 'asc' },
      take: 100,
    });

    return {
      count: invoices.length,
      invoices,
    };
  }
}
