export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  PAYPAL = 'paypal'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export enum PaymentType {
  DONATION = 'donation',
  PROGRAM_FEE = 'program_fee',
  CERTIFICATION_FEE = 'certification_fee',
  MEMBERSHIP = 'membership',
  EVENT_TICKET = 'event_ticket',
  SERVICE_FEE = 'service_fee'
}

export enum PaymentMethod {
  CARD = 'card',
  UPI = 'upi',
  NET_BANKING = 'net_banking',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash'
}

export interface PaymentMetadata {
  orderId?: string;
  invoiceId?: string;
  customerId?: string;
  subscriptionId?: string;
  notes?: Record<string, any>;
  tags?: string[];
}

export interface PaymentCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
}

export interface PaymentItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  paymentType: PaymentType;
  paymentMethod?: PaymentMethod;
  customer: PaymentCustomer;
  items?: PaymentItem[];
  metadata?: PaymentMetadata;
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
  isRecurring?: boolean;
  subscriptionFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  gateway: PaymentGateway;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  redirectUrl?: string;
  qrCodeUrl?: string;
  metadata?: PaymentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  amount: number;
  status: PaymentStatus;
  reason?: string;
  gatewayRefundId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  gateway: PaymentGateway;
  signature: string;
  timestamp: Date;
  processed: boolean;
}

export interface PaymentGatewayConfig {
  gateway: PaymentGateway;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  isTestMode: boolean;
  supportedCurrencies: string[];
  supportedMethods: PaymentMethod[];
  features: {
    subscriptions: boolean;
    refunds: boolean;
    partialRefunds: boolean;
    webhooks: boolean;
    customFields: boolean;
  };
}

export interface SubscriptionRequest {
  customerId: string;
  planId: string;
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionResponse {
  id: string;
  customerId: string;
  planId: string;
  amount: number;
  currency: string;
  frequency: string;
  status: 'active' | 'inactive' | 'cancelled' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gatewaySubscriptionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
