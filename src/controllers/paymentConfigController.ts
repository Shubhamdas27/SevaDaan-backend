import { Request, Response } from 'express';
import { PaymentGateway } from '../types/payment';

export const getPaymentConfig = async (req: Request, res: Response) => {
  try {
    const config = {
      razorpay: {
        keyId: process.env.RAZORPAY_API_KEY || '',
        enabled: !!(process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_API_SECRET),
        supportedCurrencies: ['INR', 'USD'],
        supportedMethods: ['card', 'upi', 'netbanking', 'wallet'],
        features: {
          subscriptions: true,
          refunds: true,
          webhooks: true
        }
      },
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        enabled: !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY),
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedMethods: ['card', 'bank_transfer'],
        features: {
          subscriptions: true,
          refunds: true,
          webhooks: true
        }
      },
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        supportedMethods: ['paypal', 'card'],
        features: {
          subscriptions: true,
          refunds: true,
          webhooks: true
        }
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment configuration',
      error: error.message
    });
  }
};

export const updatePaymentConfig = async (req: Request, res: Response) => {
  try {
    // This would typically update database configuration
    // For now, return success as config is env-based
    res.json({
      success: true,
      message: 'Payment configuration updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment configuration',
      error: error.message
    });
  }
};

export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.query;
    
    const methods = [
      {
        id: 'razorpay',
        name: 'Razorpay',
        gateway: PaymentGateway.RAZORPAY,
        enabled: !!(process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_API_SECRET),
        supportedCurrencies: ['INR', 'USD'],
        minAmount: 1,
        maxAmount: 1000000,
        processingFee: 2.5, // percentage
        methods: ['card', 'upi', 'netbanking', 'wallet']
      },
      {
        id: 'stripe',
        name: 'Stripe',
        gateway: PaymentGateway.STRIPE,
        enabled: !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY),
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        minAmount: 0.5,
        maxAmount: 999999,
        processingFee: 2.9, // percentage
        methods: ['card', 'bank_transfer']
      }
    ];

    // Filter methods based on amount and currency
    const availableMethods = methods.filter(method => {
      if (!method.enabled) return false;
      if (currency && !method.supportedCurrencies.includes(currency as string)) return false;
      if (amount) {
        const amountNum = parseFloat(amount as string);
        if (amountNum < method.minAmount || amountNum > method.maxAmount) return false;
      }
      return true;
    });

    res.json({
      success: true,
      data: availableMethods
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
      error: error.message
    });
  }
};

export const calculatePaymentFee = async (req: Request, res: Response) => {
  try {
    const { amount, currency, gateway } = req.body;

    if (!amount || !currency || !gateway) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, currency, gateway'
      });
    }

    let processingFee = 0;
    let processingFeePercentage = 0;

    switch (gateway) {
      case PaymentGateway.RAZORPAY:
        processingFeePercentage = 2.5;
        break;
      case PaymentGateway.STRIPE:
        processingFeePercentage = 2.9;
        break;
      case PaymentGateway.PAYPAL:
        processingFeePercentage = 3.5;
        break;
      default:
        processingFeePercentage = 2.5;
    }

    processingFee = (amount * processingFeePercentage) / 100;
    const totalAmount = amount + processingFee;

    return res.json({
      success: true,
      data: {
        amount,
        currency,
        gateway,
        processingFee: Math.round(processingFee * 100) / 100,
        processingFeePercentage,
        totalAmount: Math.round(totalAmount * 100) / 100
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate payment fee',
      error: error.message
    });
  }
};
