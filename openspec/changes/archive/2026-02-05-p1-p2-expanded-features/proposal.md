# P1/P2 Expanded Features Implementation

## Change ID
2026-02-05-p1-p2-expanded-features

## Summary
Implement 20 features to bring project completion from 57% to 77%, covering:
- PDF document generation (invoices, sales orders, POs, bills)
- Core module gaps (images, address book, payment terms, item groups)
- Transaction completeness (sales returns, vendor credits, purchase receives)
- SST tax configuration UI
- Report enhancements (stock aging, export to Excel/PDF, email notifications)

## Motivation
Complete all P1 items and key P2 items to deliver a production-ready inventory management system with essential business functionality.

## Scope

### Workstream 1: PDF Generation (4 items)
| Item | Description |
|------|-------------|
| Sales Order PDF | Generate printable/downloadable PDF |
| Invoice PDF | Generate printable/downloadable PDF |
| Purchase Order PDF | Generate printable/downloadable PDF |
| Bill PDF | Generate printable/downloadable PDF |

### Workstream 2: Core Module Gaps (4 items)
| Item | Description |
|------|-------------|
| Item Images UI | Upload, manage, reorder item images |
| Address Book | Multiple addresses per contact |
| Payment Terms | Configurable payment terms |
| Item Groups/Variants UI | Group items with variants |

### Workstream 3: Transaction Gaps (4 items)
| Item | Description |
|------|-------------|
| Sales Returns & Credit Notes | Full return workflow with credit notes |
| Vendor Credits | Vendor credit management |
| Purchase Receives Form | Frontend for receiving goods |
| Purchase by Vendor Report | Report viewer for purchases by vendor |

### Workstream 4: SST Tax System (3 items)
| Item | Description |
|------|-------------|
| Tax Rates Configuration UI | Settings page for tax rates |
| SST Registration Settings | Organization SST settings |
| Tax Calculation Engine | Complete tax calculation service |

### Workstream 5: Reports & Export (5 items)
| Item | Description |
|------|-------------|
| Stock Aging Report | Slow-moving inventory analysis |
| Export to Excel | Export reports to XLSX |
| Export to PDF | Export reports to PDF |
| Email Notifications | Transaction email notifications |

## Technical Approach
- Use PDFKit/puppeteer for PDF generation
- MinIO/S3 for file storage (images)
- Nodemailer for email notifications
- ExcelJS for Excel export
- Reuse existing Ant Design components for UI

## Success Criteria
- All 20 features implemented and functional
- PDF documents match professional invoice standards
- Email notifications sent for key transactions
- Reports exportable to Excel and PDF
- Backlog updated to reflect 77% completion
