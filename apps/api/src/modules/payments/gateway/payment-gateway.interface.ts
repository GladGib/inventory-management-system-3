export interface PaymentGatewayProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentInitResult>;
  verifyCallback(
    payload: any,
    signature: string,
  ): Promise<PaymentCallbackResult>;
  checkStatus(referenceNumber: string): Promise<PaymentStatusResult>;
  getBankList?(): Promise<BankInfo[]>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  referenceNumber: string;
  description: string;
  buyerEmail?: string;
  buyerName?: string;
  bankCode?: string;
  callbackUrl: string;
  redirectUrl: string;
}

export interface PaymentInitResult {
  paymentUrl: string;
  transactionId: string;
}

export interface PaymentCallbackResult {
  success: boolean;
  referenceNumber: string;
  gatewayRef: string;
  amount: number;
  status: string;
}

export interface PaymentStatusResult {
  status: string;
  gatewayRef: string;
  amount: number;
}

export interface BankInfo {
  code: string;
  name: string;
  active: boolean;
}
