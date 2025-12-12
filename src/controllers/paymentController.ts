import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import Donation from '../models/Donation';
import Invoice from '../models/Invoice';
import User from '../models/User';
import NGO from '../models/NGO';
import { CustomError } from '../middleware/errorMiddleware';
import { socketService } from '../socket/socketService';
import logger from '../utils/logger';
import { validationResult } from 'express-validator';
import config from '../config/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

// Async handler utility function
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create payment order
export const createPaymentOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { amount, currency, gateway, ngoId, programId, description } = req.body;
  const donorId = req.user!._id.toString();

  try {
    const orderData = await paymentService.createPaymentOrder(gateway, {
      amount,
      currency,
      donorId,
      ngoId,
      programId,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: orderData,
    });
  } catch (error) {
    logger.error('Payment order creation failed:', error);
    throw new CustomError('Failed to create payment order', 500);
  }
});

// Verify payment
export const verifyPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { gateway, paymentData } = req.body;

  try {
    const isValid = await paymentService.verifyPayment(gateway, paymentData);

    if (!isValid) {
      throw new CustomError('Payment verification failed', 400);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    logger.error('Payment verification failed:', error);
    throw new CustomError('Payment verification failed', 400);
  }
});

// Process Razorpay webhook
export const processRazorpayWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string;

  try {
    await paymentService.processWebhook('razorpay', req.body, signature);
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Razorpay webhook processing failed:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Process Stripe webhook
export const processStripeWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    await paymentService.processWebhook('stripe', req.body, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Refund payment
export const refundPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { donationId } = req.params;
  const { amount, reason } = req.body;

  try {
    const refund = await paymentService.refundPayment(donationId, amount, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refund,
    });
  } catch (error) {
    logger.error('Refund processing failed:', error);
    throw new CustomError('Failed to process refund', 500);
  }
});

// Get payment status
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { donationId } = req.params;

  try {
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email')
      .populate('ngo', 'name')
      .populate('program', 'title');

    if (!donation) {
      throw new CustomError('Donation not found', 404);
    }

    // Check if user has permission to view this donation
    const userId = req.user!._id.toString();
    const isOwner = donation.donor._id.toString() === userId;
    const isNGOAdmin = req.user!.role === 'ngo_admin' && donation.ngo._id.toString() === req.user!.ngoId?.toString();
    const isAdmin = req.user!.role === 'ngo_admin';

    if (!isOwner && !isNGOAdmin && !isAdmin) {
      throw new CustomError('Access denied', 403);
    }

    res.json({
      success: true,
      data: {
        id: donation._id,
        amount: donation.amount,
        currency: donation.currency,
        paymentStatus: donation.paymentStatus,
        paymentMethod: donation.paymentMethod,
        transactionId: donation.transactionId,
        createdAt: donation.createdAt,
        donor: donation.donor,
        ngo: donation.ngo,
        program: donation.program,
      },
    });
  } catch (error) {
    if (error instanceof CustomError) throw error;
    logger.error('Failed to get payment status:', error);
    throw new CustomError('Failed to get payment status', 500);
  }
});

// Get donation receipt
export const getDonationReceipt = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { donationId } = req.params;

  try {
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email address')
      .populate('ngo', 'name registrationNumber address')
      .populate('program', 'title description');

    if (!donation) {
      throw new CustomError('Donation not found', 404);
    }

    if (donation.paymentStatus !== 'completed') {
      throw new CustomError('Receipt only available for completed donations', 400);
    }

    // Check if user has permission to view this receipt
    const userId = req.user!._id.toString();
    const isOwner = donation.donor._id.toString() === userId;
    const isNGOAdmin = req.user!.role === 'ngo_admin' && donation.ngo._id.toString() === req.user!.ngoId?.toString();
    const isAdmin = req.user!.role === 'ngo_admin';

    if (!isOwner && !isNGOAdmin && !isAdmin) {
      throw new CustomError('Access denied', 403);
    }

    // Find or create invoice
    let invoice = await Invoice.findOne({ donation: donationId });
    if (!invoice) {
      invoice = new Invoice({
        donation: donationId,
        invoiceNumber: `INV-${Date.now()}`,
        amount: donation.amount,
        currency: donation.currency,
        donor: donation.donor._id,
        ngo: donation.ngo._id,
        issuedDate: new Date(),
        status: 'issued',
      });
      await invoice.save();
    }

    res.json({
      success: true,
      data: {
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          issuedDate: invoice.issuedDate,
          status: invoice.status,
        },
        donation: {
          id: donation._id,
          amount: donation.amount,
          currency: donation.currency,
          transactionId: donation.transactionId,
          donor: donation.donor,
          ngo: donation.ngo,
          program: donation.program,
        },
      },
    });
  } catch (error) {
    if (error instanceof CustomError) throw error;
    logger.error('Failed to get donation receipt:', error);
    throw new CustomError('Failed to get donation receipt', 500);
  }
});

// Legacy functions for backward compatibility
const generateReceiptPdf = async (donation: any): Promise<Buffer> => {
  const pdfContent = `
    Receipt for Donation
    -------------------
    Donation ID: ${donation._id}
    Amount: ${donation.amount}
    Date: ${new Date(donation.createdAt).toLocaleString()}
    -------------------
    Thank you for your donation!
  `;
  return Buffer.from(pdfContent);
};

/**
 * @desc    Initiate a payment for donation
 * @route   POST /api/payments/initiate
 * @access  Private
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { ngoId, amount, userId, donationType = 'one-time', message = '' } = req.body;

  // Validate required fields
  if (!ngoId || !amount || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Please provide ngoId, amount, and userId'
    });
  }

  // Check if amount is valid
  const donationAmount = parseInt(amount, 10);
  if (isNaN(donationAmount) || donationAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid amount'
    });
  }

  // Check if NGO exists
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    return res.status(404).json({
      success: false,
      message: 'NGO not found'
    });
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Create donation record with pending status
  const donation = await Donation.create({
    user: userId,
    ngo: ngoId,
    amount: donationAmount,
    type: donationType,
    message,
    status: 'pending',
  });

  // Create a Razorpay order
  const options = {
    amount: donationAmount * 100, // Convert to paisa (Razorpay expects amount in smallest currency unit)
    currency: 'INR',
    receipt: donation._id.toString(),
    payment_capture: 1,
    notes: {
      donationId: donation._id.toString(),
      ngoId: ngoId,
      userId: userId,
    },
  };

  try {
    const order = await razorpay.orders.create(options);
    
    // Update donation with order id
    donation.paymentId = order.id;
    await donation.save();
      // Return order details
    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        donationId: donation._id,
        amount: donationAmount,
        currency: order.currency,
        name: ngo.name,
        description: `Donation to ${ngo.name}`,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        notes: {
          donationId: donation._id.toString(),
          ngoName: ngo.name,
        }
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    
    // Delete the donation record if order creation fails
    await Donation.findByIdAndDelete(donation._id);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @desc    Verify payment webhook
 * @route   POST /api/payments/webhook
 * @access  Public
 */
export const paymentWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Verify the webhook signature
  const webhookSecret = config.razorpay.webhookSecret;
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: 'No signature found'
    });
  }

  // Validate the webhook signature
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    return res.status(400).json({
      success: false,
      message: 'Invalid signature'
    });
  }

  // Handle the event
  const event = req.body.event;

  switch (event) {
    case 'payment.authorized':
      // Payment is authorized but not captured yet
      await handlePaymentAuthorized(req.body.payload.payment.entity);
      break;

    case 'payment.captured':
      // Payment is captured successfully
      await handlePaymentCaptured(req.body.payload.payment.entity);
      break;

    case 'payment.failed':
      // Payment failed
      await handlePaymentFailed(req.body.payload.payment.entity);
      break;

    case 'refund.created':
      // Refund is initiated
      await handleRefundCreated(req.body.payload.refund.entity);
      break;

    default:
      console.log(`Unhandled event: ${event}`);
  }
  // Always acknowledge the webhook
  return res.status(200).json({ received: true });
});

/**
 * @desc    Generate receipt for donation
 * @route   GET /api/payments/:donationId/receipt
 * @access  Private
 */
export const generateReceipt = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { donationId } = req.params;

  const donation = await Donation.findById(donationId)
    .populate('ngo', 'name email logo address registrationNumber')
    .populate('user', 'name email');

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: 'Donation not found'
    });
  }

  if (donation.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot generate receipt for incomplete donation'
    });
  }

  try {
    // Generate the PDF receipt
    const pdfBuffer = await generateReceiptPdf(donation);

    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${donation._id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions for webhook handling
async function handlePaymentAuthorized(payment: any) {
  if (!payment.notes || !payment.notes.donationId) {
    console.error('No donation ID found in payment notes');
    return;
  }

  try {
    await Donation.findByIdAndUpdate(
      payment.notes.donationId,
      {
        status: 'authorized',
        paymentId: payment.id,
        paymentDetails: payment
      }
    );
  } catch (error) {
    console.error('Error updating donation after authorization:', error);
  }
}

async function handlePaymentCaptured(payment: any) {
  if (!payment.notes || !payment.notes.donationId) {
    console.error('No donation ID found in payment notes');
    return;
  }

  try {
    await Donation.findByIdAndUpdate(
      payment.notes.donationId,
      {
        status: 'completed',
        paymentId: payment.id,
        paymentDetails: payment
      }
    );
  } catch (error) {
    console.error('Error updating donation after capture:', error);
  }
}

async function handlePaymentFailed(payment: any) {
  if (!payment.notes || !payment.notes.donationId) {
    console.error('No donation ID found in payment notes');
    return;
  }

  try {
    await Donation.findByIdAndUpdate(
      payment.notes.donationId,
      {
        status: 'failed',
        paymentId: payment.id,
        paymentDetails: payment
      }
    );
  } catch (error) {
    console.error('Error updating donation after failure:', error);
  }
}

async function handleRefundCreated(refund: any) {
  try {
    // Find the donation by payment ID
    const donation = await Donation.findOne({ paymentId: refund.payment_id });
    
    if (!donation) {
      console.error('No donation found for refund with payment ID:', refund.payment_id);
      return;
    }
    
    // Update the donation status to refunded
    donation.status = 'refunded';
    donation.refundDetails = refund;
    await donation.save();
  } catch (error) {
    console.error('Error updating donation after refund:', error);
  }
}
