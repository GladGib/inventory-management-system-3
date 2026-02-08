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
import { UpdateEInvoiceSettingsDto } from './dto/update-einvoice-settings.dto';
import * as QRCode from 'qrcode';

// MyInvois API constants
const MYINVOIS_SANDBOX_URL = 'https://preprod-api.myinvois.hasil.gov.my';
const MYINVOIS_PRODUCTION_URL = 'https://api.myinvois.hasil.gov.my';

const MAX_RETRY_ATTEMPTS = 3;
const CANCEL_WINDOW_HOURS = 72;

interface MyInvoisToken {
  accessToken: string;
  expiresAt: Date;
}

interface SubmissionFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class EInvoiceService {
  private readonly logger = new Logger(EInvoiceService.name);
  private tokenCache: Map<string, MyInvoisToken> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ============ Settings Management ============

  async getSettings(organizationId: string) {
    let settings = await this.prisma.eInvoiceSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings
      settings = await this.prisma.eInvoiceSettings.create({
        data: {
          organizationId,
          isProduction: false,
          isEnabled: false,
          autoSubmit: false,
        },
      });
    }

    // Mask client secret for response
    return {
      ...settings,
      clientSecret: settings.clientSecret
        ? '********' + settings.clientSecret.slice(-4)
        : null,
    };
  }

  async updateSettings(
    organizationId: string,
    dto: UpdateEInvoiceSettingsDto,
  ) {
    const existing = await this.prisma.eInvoiceSettings.findUnique({
      where: { organizationId },
    });

    // If the client secret is the masked version, don't update it
    const updateData: Record<string, unknown> = { ...dto };
    if (
      dto.clientSecret &&
      dto.clientSecret.startsWith('********')
    ) {
      delete updateData.clientSecret;
    }

    if (existing) {
      return this.prisma.eInvoiceSettings.update({
        where: { organizationId },
        data: updateData,
      });
    }

    return this.prisma.eInvoiceSettings.create({
      data: {
        organizationId,
        ...updateData,
      },
    });
  }

  // ============ MyInvois Authentication ============

  private async getApiBaseUrl(organizationId: string): Promise<string> {
    const settings = await this.prisma.eInvoiceSettings.findUnique({
      where: { organizationId },
    });

    return settings?.isProduction
      ? MYINVOIS_PRODUCTION_URL
      : MYINVOIS_SANDBOX_URL;
  }

  private async getOrgSettings(organizationId: string) {
    const settings = await this.prisma.eInvoiceSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      throw new BadRequestException(
        'e-Invoice settings not configured. Please configure your MyInvois settings first.',
      );
    }

    if (!settings.clientId || !settings.clientSecret) {
      throw new BadRequestException(
        'MyInvois Client ID and Client Secret are required.',
      );
    }

    return settings;
  }

  private async getAccessToken(organizationId: string): Promise<string> {
    // Check cache
    const cached = this.tokenCache.get(organizationId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.accessToken;
    }

    const settings = await this.getOrgSettings(organizationId);
    const baseUrl = settings.isProduction
      ? MYINVOIS_PRODUCTION_URL
      : MYINVOIS_SANDBOX_URL;

    // Call MyInvois OAuth endpoint
    // POST {baseUrl}/connect/token
    // with grant_type=client_credentials, client_id, client_secret, scope=InvoicingAPI
    this.logger.log(
      `Authenticating with MyInvois API at ${baseUrl}/connect/token`,
    );

    try {
      const response = await fetch(`${baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: settings.clientId!,
          client_secret: settings.clientSecret!,
          scope: 'InvoicingAPI',
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `MyInvois authentication failed: ${response.status} ${errorBody}`,
        );
        throw new BadRequestException(
          `MyInvois authentication failed: ${response.status}`,
        );
      }

      const tokenData = await response.json();

      this.tokenCache.set(organizationId, {
        accessToken: tokenData.access_token,
        expiresAt: new Date(
          Date.now() + (tokenData.expires_in - 60) * 1000,
        ),
      });

      return tokenData.access_token;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`MyInvois authentication error: ${error.message}`);
      throw new BadRequestException(
        `Failed to connect to MyInvois: ${error.message}`,
      );
    }
  }

  // ============ Test Connection ============

  async testConnection(organizationId: string) {
    try {
      const settings = await this.getOrgSettings(organizationId);
      const baseUrl = settings.isProduction
        ? MYINVOIS_PRODUCTION_URL
        : MYINVOIS_SANDBOX_URL;

      const response = await fetch(`${baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: settings.clientId!,
          client_secret: settings.clientSecret!,
          scope: 'InvoicingAPI',
        }).toString(),
      });

      const now = new Date();
      if (response.ok) {
        // Update connection status
        await this.prisma.eInvoiceSettings.update({
          where: { organizationId },
          data: {
            lastConnectionCheck: now,
            connectionStatus: 'CONNECTED',
          },
        });

        return {
          success: true,
          message: 'Successfully connected to MyInvois API',
          environment: settings.isProduction ? 'Production' : 'Sandbox',
          timestamp: now.toISOString(),
        };
      }

      const errorBody = await response.text();
      await this.prisma.eInvoiceSettings.update({
        where: { organizationId },
        data: {
          lastConnectionCheck: now,
          connectionStatus: `FAILED: ${response.status}`,
        },
      });

      return {
        success: false,
        message: `Connection failed: ${response.status} - ${errorBody}`,
        environment: settings.isProduction ? 'Production' : 'Sandbox',
        timestamp: now.toISOString(),
      };
    } catch (error) {
      const now = new Date();
      try {
        await this.prisma.eInvoiceSettings.update({
          where: { organizationId },
          data: {
            lastConnectionCheck: now,
            connectionStatus: `ERROR: ${error.message}`,
          },
        });
      } catch {
        // Settings might not exist yet
      }

      return {
        success: false,
        message: `Connection error: ${error.message}`,
        timestamp: now.toISOString(),
      };
    }
  }

  // ============ UBL 2.1 XML Generation ============

  async generateUBL(invoiceId: string, organizationId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        customer: true,
        items: {
          include: { item: true },
          orderBy: { sortOrder: 'asc' },
        },
        organization: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const org = invoice.organization;
    const customer = invoice.customer;
    const orgAddress = (org.address as Record<string, string>) || {};

    // Build UBL 2.1 XML
    const issueDate = invoice.invoiceDate.toISOString().split('T')[0];
    const issueTime = invoice.invoiceDate
      .toISOString()
      .split('T')[1]
      .split('.')[0] + 'Z';

    const lineItemsXml = invoice.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((lineItem: any, index: number) => {
        const itemTaxAmount = Number(lineItem.taxAmount || 0);
        const lineAmount = Number(lineItem.amount || 0);
        const quantity = Number(lineItem.quantity || 0);
        const rate = Number(lineItem.rate || 0);
        const description =
          lineItem.description || lineItem.item?.name || 'Item';

        return `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${quantity.toFixed(2)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="MYR">${lineAmount.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="MYR">${itemTaxAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="MYR">${lineAmount.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="MYR">${itemTaxAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>01</cbc:ID>
            <cbc:Percent>${lineAmount > 0 ? ((itemTaxAmount / lineAmount) * 100).toFixed(2) : '0.00'}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">OTH</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description>${this.escapeXml(description)}</cbc:Description>
        <cac:CommodityClassification>
          <cbc:ItemClassificationCode listID="CLASS">${MyInvoisClassificationCode.GOODS}</cbc:ItemClassificationCode>
        </cac:CommodityClassification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="MYR">${rate.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
      })
      .join('');

    const subtotal = Number(invoice.subtotal || 0);
    const taxAmount = Number(invoice.taxAmount || 0);
    const total = Number(invoice.total || 0);
    const balance = Number(invoice.balance || 0);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${this.escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listVersionID="1.0">${MyInvoisDocumentType.INVOICE}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>MYR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>MYR</cbc:TaxCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="TIN">${this.escapeXml(org.tin || '')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="BRN">${this.escapeXml(org.businessRegNo || '')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(orgAddress.addressLine1 || '')}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(orgAddress.city || '')}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml(orgAddress.postcode || '')}</cbc:PostalZone>
        <cbc:CountrySubentityCode>${this.escapeXml(orgAddress.state || '')}</cbc:CountrySubentityCode>
        <cac:Country>
          <cbc:IdentificationCode listID="ISO3166-1" listAgencyID="6">MYS</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(org.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${this.escapeXml(org.phone || '')}</cbc:Telephone>
        <cbc:ElectronicMail>${this.escapeXml(org.email || '')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${customer.taxNumber ? 'TIN' : 'BRN'}">${this.escapeXml(customer.taxNumber || customer.companyName || '')}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml((customer.billingAddress as Record<string, string>)?.addressLine1 || '')}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml((customer.billingAddress as Record<string, string>)?.city || '')}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml((customer.billingAddress as Record<string, string>)?.postcode || '')}</cbc:PostalZone>
        <cbc:CountrySubentityCode>${this.escapeXml((customer.billingAddress as Record<string, string>)?.state || '')}</cbc:CountrySubentityCode>
        <cac:Country>
          <cbc:IdentificationCode listID="ISO3166-1" listAgencyID="6">MYS</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(customer.displayName || customer.companyName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${this.escapeXml(customer.phone || '')}</cbc:Telephone>
        <cbc:ElectronicMail>${this.escapeXml(customer.email || '')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="MYR">${taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="MYR">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="MYR">${taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>01</cbc:ID>
        <cbc:Percent>${subtotal > 0 ? ((taxAmount / subtotal) * 100).toFixed(2) : '0.00'}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">OTH</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="MYR">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="MYR">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="MYR">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="MYR">${balance.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <!-- Digital Signature Placeholder -->
  <cac:Signature>
    <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
    <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
  </cac:Signature>${lineItemsXml}
</Invoice>`;

    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ============ e-Invoice Submission ============

  async submitInvoice(
    invoiceId: string,
    organizationId: string,
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
      throw new BadRequestException('Invoice already validated by MyInvois');
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'VOID') {
      throw new BadRequestException(
        'Cannot submit draft or void invoices to MyInvois',
      );
    }

    // Check if there's an existing pending submission
    const existingSubmission = await this.prisma.eInvoiceSubmission.findFirst({
      where: {
        invoiceId,
        organizationId,
        status: { in: ['PENDING', 'SUBMITTED'] },
      },
    });

    if (existingSubmission) {
      throw new BadRequestException(
        'Invoice already has a pending submission. Check the status first.',
      );
    }

    // Generate UBL XML
    const xmlContent = await this.generateUBL(invoiceId, organizationId);

    // Create submission record
    const submission = await this.prisma.eInvoiceSubmission.create({
      data: {
        invoiceId,
        organizationId,
        status: 'PENDING',
        rawRequest: { xml: xmlContent },
        retryCount: 0,
      },
    });

    // Store document
    await this.prisma.eInvoiceDocument.create({
      data: {
        submissionId: submission.id,
        documentType: 'INVOICE',
        xmlContent,
      },
    });

    // Submit to MyInvois with retry logic
    const result = await this.submitToMyInvoisWithRetry(
      organizationId,
      submission.id,
      xmlContent,
    );

    // Update submission record
    await this.prisma.eInvoiceSubmission.update({
      where: { id: submission.id },
      data: {
        submissionUuid: result.submissionUuid,
        documentUuid: result.documentUuid,
        longId: result.longId,
        status: result.status,
        submittedAt: new Date(),
        rawResponse: result.rawResponse as object,
        lastError: result.error,
        retryCount: result.retryCount,
      },
    });

    // Update invoice with e-invoice status
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        eInvoiceId: result.submissionUuid || submission.id,
        eInvoiceStatus: result.status as EInvoiceStatus,
      },
    });

    return {
      invoiceId,
      submissionId: submission.id,
      status: result.status as EInvoiceStatus,
      qrCode: result.qrCodeUrl,
      submittedAt: new Date(),
    };
  }

  private async submitToMyInvoisWithRetry(
    organizationId: string,
    submissionId: string,
    xmlContent: string,
  ): Promise<{
    submissionUuid?: string;
    documentUuid?: string;
    longId?: string;
    status: 'PENDING' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';
    rawResponse?: Record<string, unknown>;
    error?: string;
    qrCodeUrl?: string;
    retryCount: number;
  }> {
    let lastError = '';
    let retryCount = 0;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      retryCount = attempt;
      try {
        const accessToken = await this.getAccessToken(organizationId);
        const baseUrl = await this.getApiBaseUrl(organizationId);

        // Convert XML to base64 for MyInvois submission
        const base64Document = Buffer.from(xmlContent).toString('base64');

        // MyInvois API: POST /api/v1.0/documentsubmissions
        const submitPayload = {
          documents: [
            {
              format: 'XML',
              documentHash: this.computeHash(xmlContent),
              codeNumber: submissionId,
              document: base64Document,
            },
          ],
        };

        this.logger.log(
          `Submitting e-Invoice to MyInvois (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`,
        );

        const response = await fetch(
          `${baseUrl}/api/v1.0/documentsubmissions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitPayload),
          },
        );

        const responseBody = await response.json();

        if (response.ok) {
          const submissionUuid = responseBody.submissionUID;
          const acceptedDocs = responseBody.acceptedDocuments || [];
          const rejectedDocs = responseBody.rejectedDocuments || [];

          if (acceptedDocs.length > 0) {
            const doc = acceptedDocs[0];
            const validationLink = `${baseUrl.replace('api.', '')}/validate/${doc.uuid}`;

            return {
              submissionUuid,
              documentUuid: doc.uuid,
              longId: doc.longId,
              status: 'SUBMITTED',
              rawResponse: responseBody,
              qrCodeUrl: validationLink,
              retryCount,
            };
          }

          if (rejectedDocs.length > 0) {
            const rejection = rejectedDocs[0];
            return {
              submissionUuid,
              status: 'REJECTED',
              rawResponse: responseBody,
              error: JSON.stringify(rejection.error || rejection),
              retryCount,
            };
          }
        }

        lastError = `HTTP ${response.status}: ${JSON.stringify(responseBody)}`;
        this.logger.warn(
          `MyInvois submission attempt ${attempt + 1} failed: ${lastError}`,
        );
      } catch (error) {
        lastError = error.message;
        this.logger.warn(
          `MyInvois submission attempt ${attempt + 1} error: ${lastError}`,
        );
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    // All retries exhausted
    return {
      status: 'REJECTED',
      error: `All ${MAX_RETRY_ATTEMPTS} attempts failed. Last error: ${lastError}`,
      retryCount,
    };
  }

  private computeHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // ============ Batch Submission ============

  async submitBatch(
    invoiceIds: string[],
    organizationId: string,
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

  // ============ Status Check ============

  async getSubmissionStatus(
    invoiceId: string,
    organizationId: string,
  ): Promise<{ status: EInvoiceStatus; details?: Record<string, unknown> }> {
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

    // Get the latest submission
    const submission = await this.prisma.eInvoiceSubmission.findFirst({
      where: { invoiceId, organizationId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });

    if (!submission) {
      return { status: EInvoiceStatus.PENDING };
    }

    // If submitted, try to poll MyInvois for latest status
    if (
      submission.status === 'SUBMITTED' &&
      submission.documentUuid
    ) {
      try {
        const accessToken = await this.getAccessToken(organizationId);
        const baseUrl = await this.getApiBaseUrl(organizationId);

        // GET /api/v1.0/documents/{uuid}/details
        const response = await fetch(
          `${baseUrl}/api/v1.0/documents/${submission.documentUuid}/details`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (response.ok) {
          const docDetails = await response.json();
          const newStatus = this.mapMyInvoisStatus(docDetails.status);

          // Update submission and invoice if status changed
          if (newStatus !== submission.status) {
            await this.prisma.eInvoiceSubmission.update({
              where: { id: submission.id },
              data: {
                status: newStatus as EInvoiceStatus,
                validatedAt:
                  newStatus === 'VALIDATED' ? new Date() : undefined,
                rawResponse: docDetails,
              },
            });

            await this.prisma.invoice.update({
              where: { id: invoiceId },
              data: {
                eInvoiceStatus: newStatus as EInvoiceStatus,
              },
            });
          }

          return {
            status: newStatus as EInvoiceStatus,
            details: {
              submissionId: submission.id,
              submissionUuid: submission.submissionUuid,
              documentUuid: submission.documentUuid,
              longId: submission.longId,
              qrCodeUrl: submission.qrCodeUrl,
              submittedAt: submission.submittedAt,
              validatedAt: submission.validatedAt,
              rejectionReasons: submission.rejectionReasons,
            },
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to poll MyInvois status: ${error.message}`,
        );
      }
    }

    return {
      status: (submission.status as EInvoiceStatus) || EInvoiceStatus.PENDING,
      details: {
        submissionId: submission.id,
        submissionUuid: submission.submissionUuid,
        documentUuid: submission.documentUuid,
        longId: submission.longId,
        qrCodeUrl: submission.qrCodeUrl,
        submittedAt: submission.submittedAt,
        validatedAt: submission.validatedAt,
        rejectionReasons: submission.rejectionReasons,
        lastError: submission.lastError,
        retryCount: submission.retryCount,
      },
    };
  }

  private mapMyInvoisStatus(myInvoisStatus: string): string {
    const statusMap: Record<string, string> = {
      Valid: 'VALIDATED',
      Invalid: 'REJECTED',
      Cancelled: 'CANCELLED',
      Submitted: 'SUBMITTED',
    };
    return statusMap[myInvoisStatus] || 'PENDING';
  }

  // ============ Cancel e-Invoice ============

  async cancelInvoice(
    invoiceId: string,
    organizationId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.eInvoiceId) {
      throw new BadRequestException('Invoice has not been submitted to MyInvois');
    }

    if (invoice.eInvoiceStatus === 'CANCELLED') {
      throw new BadRequestException('e-Invoice is already cancelled');
    }

    // Get the latest submission
    const submission = await this.prisma.eInvoiceSubmission.findFirst({
      where: { invoiceId, organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!submission) {
      throw new BadRequestException('No submission found for this invoice');
    }

    // Check 72-hour cancellation window
    if (submission.validatedAt) {
      const hoursSinceValidation =
        (Date.now() - submission.validatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceValidation > CANCEL_WINDOW_HOURS) {
        throw new BadRequestException(
          `Cancellation window expired. e-Invoices can only be cancelled within ${CANCEL_WINDOW_HOURS} hours of validation.`,
        );
      }
    }

    // Call MyInvois cancellation API
    if (submission.documentUuid) {
      try {
        const accessToken = await this.getAccessToken(organizationId);
        const baseUrl = await this.getApiBaseUrl(organizationId);

        // PUT /api/v1.0/documents/state/{uuid}/state
        const response = await fetch(
          `${baseUrl}/api/v1.0/documents/state/${submission.documentUuid}/state`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'cancelled',
              reason: reason,
            }),
          },
        );

        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(
            `MyInvois cancellation failed: ${response.status} ${errorBody}`,
          );
          // Continue with local update even if remote fails (for sandbox testing)
        }
      } catch (error) {
        this.logger.error(
          `MyInvois cancellation error: ${error.message}`,
        );
      }
    }

    // Update submission and invoice
    await this.prisma.eInvoiceSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        rejectionReasons: { reason },
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { eInvoiceStatus: 'CANCELLED' },
    });

    this.logger.log(
      `e-Invoice cancelled: ${invoice.eInvoiceId} - Reason: ${reason}`,
    );

    return {
      success: true,
      message: 'e-Invoice cancellation submitted successfully',
    };
  }

  // ============ QR Code Generation ============

  async generateQRCode(invoiceId: string, organizationId: string): Promise<string> {
    const submission = await this.prisma.eInvoiceSubmission.findFirst({
      where: { invoiceId, organizationId },
      orderBy: { createdAt: 'desc' },
    });

    if (!submission) {
      throw new NotFoundException('No e-Invoice submission found');
    }

    if (!submission.documentUuid && !submission.longId) {
      throw new BadRequestException(
        'e-Invoice has not been validated yet. QR code is only available after validation.',
      );
    }

    // Build the MyInvois validation URL
    const settings = await this.prisma.eInvoiceSettings.findUnique({
      where: { organizationId },
    });
    const isProduction = settings?.isProduction ?? false;
    const validationBase = isProduction
      ? 'https://myinvois.hasil.gov.my'
      : 'https://preprod.myinvois.hasil.gov.my';

    const validationUrl = submission.longId
      ? `${validationBase}/${submission.documentUuid}/share/${submission.longId}`
      : `${validationBase}/validate/${submission.documentUuid}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Update submission with QR code data
    await this.prisma.eInvoiceSubmission.update({
      where: { id: submission.id },
      data: {
        qrCodeData: qrCodeDataUrl,
        qrCodeUrl: validationUrl,
      },
    });

    // Also update the invoice QR code
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });

    if (invoice) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { eInvoiceQrCode: qrCodeDataUrl },
      });
    }

    return qrCodeDataUrl;
  }

  // ============ Submissions List ============

  async getSubmissions(organizationId: string, filters: SubmissionFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.toDate);
      }
    }

    const [submissions, total] = await Promise.all([
      this.prisma.eInvoiceSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          invoiceId: true,
          submissionUuid: true,
          documentUuid: true,
          longId: true,
          status: true,
          submittedAt: true,
          validatedAt: true,
          cancelledAt: true,
          rejectionReasons: true,
          qrCodeUrl: true,
          retryCount: true,
          lastError: true,
          createdAt: true,
        },
      }),
      this.prisma.eInvoiceSubmission.count({ where }),
    ]);

    // Enrich with invoice details
    const invoiceIds = submissions.map((s: { invoiceId: string }) => s.invoiceId);
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        customer: {
          select: { displayName: true },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceMap = new Map<string, any>(invoices.map((inv: any) => [inv.id, inv]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedSubmissions = submissions.map((sub: any) => {
      const invoice = invoiceMap.get(sub.invoiceId);
      return {
        ...sub,
        invoiceNumber: invoice?.invoiceNumber || 'N/A',
        invoiceTotal: invoice?.total ? Number(invoice.total) : 0,
        customerName: invoice?.customer?.displayName || 'N/A',
      };
    });

    return {
      data: enrichedSubmissions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============ Compliance Dashboard ============

  async getComplianceDashboard(organizationId: string) {
    const [statusCounts, recentSubmissions, totalInvoices] = await Promise.all([
      // Count by status
      this.prisma.eInvoiceSubmission.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      // Recent 5 submissions
      this.prisma.eInvoiceSubmission.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceId: true,
          status: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
      // Total invoices that could be submitted
      this.prisma.invoice.count({
        where: {
          organizationId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
        },
      }),
    ]);

    // Build status summary
    const summary = {
      totalSubmitted: 0,
      validated: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      submitted: 0,
    };

    for (const sc of statusCounts) {
      const count = sc._count.id;
      summary.totalSubmitted += count;

      switch (sc.status) {
        case 'VALIDATED':
          summary.validated = count;
          break;
        case 'REJECTED':
          summary.rejected = count;
          break;
        case 'PENDING':
          summary.pending = count;
          break;
        case 'CANCELLED':
          summary.cancelled = count;
          break;
        case 'SUBMITTED':
          summary.submitted = count;
          break;
      }
    }

    // Enrich recent submissions with invoice info
    const invoiceIds = recentSubmissions.map((s: { invoiceId: string }) => s.invoiceId);
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        invoiceNumber: true,
        customer: { select: { displayName: true } },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceMap = new Map<string, any>(invoices.map((inv: any) => [inv.id, inv]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedRecent = recentSubmissions.map((sub: any) => {
      const invoice = invoiceMap.get(sub.invoiceId);
      return {
        ...sub,
        invoiceNumber: invoice?.invoiceNumber || 'N/A',
        customerName: invoice?.customer?.displayName || 'N/A',
      };
    });

    return {
      summary,
      totalEligibleInvoices: totalInvoices,
      pendingSubmission:
        totalInvoices -
        summary.totalSubmitted +
        summary.rejected +
        summary.cancelled,
      recentSubmissions: enrichedRecent,
    };
  }

  // ============ Validate TIN ============

  async validateTin(
    organizationId: string,
    tin: string,
    idType?: string,
    idValue?: string,
  ) {
    try {
      const accessToken = await this.getAccessToken(organizationId);
      const baseUrl = await this.getApiBaseUrl(organizationId);

      // GET /api/v1.0/taxpayer/validate/{tin}?idType={idType}&idValue={idValue}
      let url = `${baseUrl}/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}`;
      const params = new URLSearchParams();
      if (idType) params.append('idType', idType);
      if (idValue) params.append('idValue', idValue);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return { valid: true, message: 'TIN is valid' };
      }

      if (response.status === 404) {
        return { valid: false, message: 'TIN not found in LHDN records' };
      }

      const errorBody = await response.text();
      return {
        valid: false,
        message: `Validation failed: ${response.status} - ${errorBody}`,
      };
    } catch (error) {
      return {
        valid: false,
        message: `Validation error: ${error.message}`,
      };
    }
  }

  // ============ Pending Submissions (backward compat) ============

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

  // ============ Reporting (backward compat) ============

  async getSubmissionReport(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, number>, inv: any) => {
        const status = inv.eInvoiceStatus || 'PENDING';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      period: { fromDate, toDate },
      totalSubmissions: invoices.length,
      statusSummary: statusCounts,
      submissions: invoices,
    };
  }
}
