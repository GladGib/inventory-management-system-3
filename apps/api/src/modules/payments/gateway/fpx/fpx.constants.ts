import { BankInfo } from '../payment-gateway.interface';

export const MALAYSIAN_BANKS: BankInfo[] = [
  { code: 'ABB0233', name: 'Affin Bank', active: true },
  { code: 'ABMB0212', name: 'Alliance Bank', active: true },
  { code: 'AMBB0209', name: 'AmBank', active: true },
  { code: 'BIMB0340', name: 'Bank Islam', active: true },
  { code: 'BMMB0341', name: 'Bank Muamalat', active: true },
  { code: 'BKRM0602', name: 'Bank Rakyat', active: true },
  { code: 'BSN0601', name: 'BSN', active: true },
  { code: 'BCBB0235', name: 'CIMB Bank', active: true },
  { code: 'HLB0224', name: 'Hong Leong Bank', active: true },
  { code: 'HSBC0223', name: 'HSBC Bank', active: true },
  { code: 'KFH0346', name: 'Kuwait Finance House', active: true },
  { code: 'MBB0227', name: 'Maybank', active: true },
  { code: 'MB2U0227', name: 'Maybank2U', active: true },
  { code: 'OCBC0229', name: 'OCBC Bank', active: true },
  { code: 'PBB0233', name: 'Public Bank', active: true },
  { code: 'RHB0218', name: 'RHB Bank', active: true },
  { code: 'SCB0216', name: 'Standard Chartered', active: true },
  { code: 'UOB0226', name: 'UOB Bank', active: true },
];

/**
 * FPX transaction status codes returned by the gateway
 */
export const FPX_STATUS_CODES: Record<string, string> = {
  '00': 'COMPLETED', // Successful
  '09': 'PENDING', // Transaction pending
  '99': 'FAILED', // Transaction failed
  'OE': 'FAILED', // Originator or end user error
  'OF': 'FAILED', // Format error
  'OC': 'FAILED', // Transaction cancelled by customer
  'OT': 'EXPIRED', // Timeout
};

/**
 * FPX message type constants
 */
export const FPX_MESSAGE_TYPES = {
  AUTHORIZATION_REQUEST: 'AR',
  AUTHORIZATION_RESPONSE: 'AC',
  BANK_ENQUIRY_REQUEST: 'BE',
  BANK_ENQUIRY_RESPONSE: 'BC',
} as const;
