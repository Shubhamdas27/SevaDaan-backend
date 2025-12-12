import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import config from '../config/config';
import Donation from '../models/Donation';
import Invoice from '../models/Invoice';
import { socketService } from '../socket/socketService';
import logger from '../utils/logger';

// Initialize payment gateways
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-06-30.basil',
});

interface PaymentOrderData {
  amount: number;
  currency: string;
  donorId: string;
  ngoId: string;
  programId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface PaymentGateway {
  createOrder(data: PaymentOrderData): Promise<any>;
  verifyPayment(paymentData: any): Promise<boolean>;
  processWebhook(payload: any, signature: string): Promise<void>;
}

class RazorpayService implements PaymentGateway {
  async createOrder(data: PaymentOrderData): Promise<any> {
    try {
      const options = {
        amount: Math.round(data.amount * 100), // Amount in paisa
        currency: data.currency || 'INR',
        receipt: `donation_${Date.now()}`,
        notes: {
          donorId: data.donorId,
          ngoId: data.ngoId,
          programId: data.programId || '',
          description: data.description || '',
          ...data.metadata,
        },
      };

      const order = await razorpay.orders.create(options);
      
      // Create donation record with pending status
      const donation = new Donation({
        donor: data.donorId,
        ngo: data.ngoId,
        program: data.programId,
        amount: data.amount,
        currency: data.currency || 'INR',
        paymentGateway: 'razorpay',
        razorpayOrderId: order.id,
        paymentStatus: 'pending',
        description: data.description,
        metadata: data.metadata,
      });

      await donation.save();

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        donationId: donation._id,
      };
    } catch (error) {
      logger.error('Razorpay order creation failed:', error);
      throw new Error('Payment order creation failed');
    }
  }

  async verifyPayment(paymentData: any): Promise<boolean> {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = paymentData;

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      logger.error('Razorpay payment verification failed:', error);
      return false;
    }
  }

  async processWebhook(payload: any, signature: string): Promise<void> {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }

      const { event, payload: eventPayload } = payload;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(eventPayload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(eventPayload.payment.entity);
          break;
        default:
          logger.info(`Unhandled Razorpay event: ${event}`);
      }
    } catch (error) {
      logger.error('Razorpay webhook processing failed:', error);
      throw error;
    }
  }

  private async handlePaymentCaptured(payment: any): Promise<void> {
    const donation = await Donation.findOne({
      razorpayOrderId: payment.order_id,
    }).populate('donor ngo program');

    if (donation) {
      donation.paymentStatus = 'completed';
      donation.razorpayPaymentId = payment.id;
      donation.transactionId = payment.id;
      await donation.save();

      // Generate invoice
      await this.generateInvoice(donation);

      // Emit real-time events
      socketService.emitToUser(donation.donor._id.toString(), 'donation_completed', {
        donationId: donation._id,
        amount: donation.amount,
        ngoName: (donation.ngo as any)?.name || 'Unknown NGO',
      });

      socketService.emitToNGO(donation.ngo._id.toString(), 'donation_received', {
        donationId: donation._id,
        amount: donation.amount,
        donorName: (donation.donor as any)?.name || 'Anonymous',
      });

      logger.info(`Payment completed for donation: ${donation._id}`);
    }
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    const donation = await Donation.findOne({
      razorpayOrderId: payment.order_id,
    });

    if (donation) {
      donation.paymentStatus = 'failed';
      donation.notes = `Payment failed: ${payment.error_description || 'Unknown error'}`;
      await donation.save();

      // Emit real-time events
      socketService.emitToUser(donation.donor._id.toString(), 'donation_failed', {
        donationId: donation._id,
        reason: payment.error_description,
      });

      logger.error(`Payment failed for donation: ${donation._id}`);
    }
  }

  private async generateInvoice(donation: any): Promise<void> {
    const invoice = new Invoice({
      donation: donation._id,
      invoiceNumber: `INV-${Date.now()}`,
      amount: donation.amount,
      currency: donation.currency,
      donor: donation.donor,
      ngo: donation.ngo,
      issuedAt: new Date(),
      status: 'issued',
    });

    await invoice.save();
  }
}

class StripeService implements PaymentGateway {
  async createOrder(data: PaymentOrderData): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Amount in cents
        currency: data.currency || 'usd',
        metadata: {
          donorId: data.donorId,
          ngoId: data.ngoId,
          programId: data.programId || '',
          description: data.description || '',
          ...data.metadata,
        },
      });

      // Create donation record with pending status
      const donation = new Donation({
        donor: data.donorId,
        ngo: data.ngoId,
        program: data.programId,
        amount: data.amount,
        currency: data.currency || 'usd',
        paymentGateway: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'pending',
        description: data.description,
        metadata: data.metadata,
      });

      await donation.save();

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        donationId: donation._id,
      };
    } catch (error) {
      logger.error('Stripe payment intent creation failed:', error);
      throw new Error('Payment order creation failed');
    }
  }

  async verifyPayment(paymentData: any): Promise<boolean> {
    try {
      const { paymentIntentId } = paymentData;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      logger.error('Stripe payment verification failed:', error);
      return false;
    }
  }

  async processWebhook(payload: any, signature: string): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Stripe webhook processing failed:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    const donation = await Donation.findOne({
      transactionId: paymentIntent.id,
    }).populate('donor ngo program');

    if (donation) {
      donation.paymentStatus = 'completed';
      donation.transactionId = paymentIntent.id;
      await donation.save();

      // Generate invoice
      await this.generateInvoice(donation);

      // Emit real-time events
      socketService.emitToUser(donation.donor._id.toString(), 'donation_completed', {
        donationId: donation._id,
        amount: donation.amount,
        ngoName: (donation.ngo as any)?.name || 'Unknown NGO',
      });

      socketService.emitToNGO(donation.ngo._id.toString(), 'donation_received', {
        donationId: donation._id,
        amount: donation.amount,
        donorName: (donation.donor as any)?.name || 'Anonymous',
      });

      logger.info(`Payment completed for donation: ${donation._id}`);
    }
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    const donation = await Donation.findOne({
      transactionId: paymentIntent.id,
    });

    if (donation) {
      donation.paymentStatus = 'failed';
      await donation.save();

      // Emit real-time events
      socketService.emitToUser(donation.donor._id.toString(), 'donation_failed', {
        donationId: donation._id,
        reason: paymentIntent.last_payment_error?.message,
      });

      logger.error(`Payment failed for donation: ${donation._id}`);
    }
  }

  private async generateInvoice(donation: any): Promise<void> {
    const invoice = new Invoice({
      donation: donation._id,
      invoiceNumber: `INV-${Date.now()}`,
      amount: donation.amount,
      currency: donation.currency,
      donor: donation.donor,
      ngo: donation.ngo,
      issuedAt: new Date(),
      status: 'issued',
    });

    await invoice.save();
  }
}

export class PaymentService {
  private razorpayService: RazorpayService;
  private stripeService: StripeService;

  constructor() {
    this.razorpayService = new RazorpayService();
    this.stripeService = new StripeService();
  }

  getPaymentGateway(gateway: 'razorpay' | 'stripe'): PaymentGateway {
    switch (gateway) {
      case 'razorpay':
        return this.razorpayService;
      case 'stripe':
        return this.stripeService;
      default:
        throw new Error('Unsupported payment gateway');
    }
  }

  async createPaymentOrder(
    gateway: 'razorpay' | 'stripe',
    data: PaymentOrderData
  ): Promise<any> {
    const paymentGateway = this.getPaymentGateway(gateway);
    return await paymentGateway.createOrder(data);
  }

  async verifyPayment(
    gateway: 'razorpay' | 'stripe',
    paymentData: any
  ): Promise<boolean> {
    const paymentGateway = this.getPaymentGateway(gateway);
    return await paymentGateway.verifyPayment(paymentData);
  }

  async processWebhook(
    gateway: 'razorpay' | 'stripe',
    payload: any,
    signature: string
  ): Promise<void> {
    const paymentGateway = this.getPaymentGateway(gateway);
    await paymentGateway.processWebhook(payload, signature);
  }

  async refundPayment(
    donationId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const donation = await Donation.findById(donationId);
      if (!donation) {
        throw new Error('Donation not found');
      }

      if (donation.paymentStatus !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      const refundAmount = amount || donation.amount;

      let refund;
      if (donation.paymentMethod === 'razorpay') {
        refund = await razorpay.payments.refund(donation.razorpayPaymentId!, {
          amount: Math.round(refundAmount * 100),
          notes: { reason: reason || 'Refund requested' },
        });
      } else if (donation.paymentMethod === 'stripe') {
        refund = await stripe.refunds.create({
          payment_intent: donation.transactionId!,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
          metadata: { reason: reason || 'Refund requested' },
        });
      }

      // Update donation status
      donation.paymentStatus = 'refunded';
      
      // Store refund info in refund field if it exists, or notes
      if (donation.refund) {
        donation.refund.amount = refundAmount;
        donation.refund.reason = reason || 'Refund requested';
        donation.refund.status = 'processed';
        donation.refund.processedAt = new Date();
      } else {
        donation.notes = `Refunded: ${refundAmount} - ${reason || 'Refund requested'}`;
      }
      
      await donation.save();

      // Emit real-time events
      socketService.emitToUser(donation.donor._id.toString(), 'donation_refunded', {
        donationId: donation._id,
        amount: refundAmount,
        reason,
      });

      socketService.emitToNGO(donation.ngo._id.toString(), 'donation_refunded', {
        donationId: donation._id,
        amount: refundAmount,
        reason,
      });

      logger.info(`Refund processed for donation: ${donation._id}`);
      return refund;
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
