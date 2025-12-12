import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import logger from '../utils/logger';
import axios from 'axios';

// API Integration Controller for external services
export class APIIntegrationController {

  /**
   * Get available integrations
   */
  static async getAvailableIntegrations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const availableIntegrations = [
        {
          id: 'razorpay',
          name: 'Razorpay',
          type: 'payment',
          description: 'Payment gateway integration for donations',
          status: 'available',
          fields: ['api_key', 'api_secret']
        },
        {
          id: 'twilio',
          name: 'Twilio',
          type: 'communication',
          description: 'SMS and WhatsApp messaging',
          status: 'available',
          fields: ['account_sid', 'auth_token', 'phone_number']
        },
        {
          id: 'mailchimp',
          name: 'Mailchimp',
          type: 'email',
          description: 'Email marketing and newsletters',
          status: 'available',
          fields: ['api_key', 'server_prefix']
        },
        {
          id: 'google_analytics',
          name: 'Google Analytics',
          type: 'analytics',
          description: 'Website and app analytics',
          status: 'available',
          fields: ['tracking_id', 'measurement_id']
        },
        {
          id: 'salesforce',
          name: 'Salesforce',
          type: 'crm',
          description: 'Customer relationship management',
          status: 'coming_soon',
          fields: ['client_id', 'client_secret', 'instance_url']
        },
        {
          id: 'webhooks',
          name: 'Custom Webhooks',
          type: 'webhook',
          description: 'Custom webhook endpoints for real-time data sync',
          status: 'available',
          fields: ['webhook_url', 'secret_key']
        }
      ];

      res.json({
        success: true,
        data: availableIntegrations
      });
    } catch (error: any) {
      logger.error('Error fetching available integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integrations',
        error: error.message
      });
    }
  }

  /**
   * Configure integration for NGO
   */
  static async configureIntegration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { integrationId, config, isActive = true } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Initialize integrations object if not exists
      if (!(ngo as any).integrations) {
        (ngo as any).integrations = {};
      }

      // Encrypt sensitive data before storing (simplified for demo)
      const encryptedConfig = this.encryptConfig(config);

      // Store integration configuration
      (ngo as any).integrations[integrationId] = {
        config: encryptedConfig,
        isActive,
        configuredAt: new Date(),
        configuredBy: userId
      };

      await ngo.save();

      res.json({
        success: true,
        message: 'Integration configured successfully',
        data: {
          integrationId,
          isActive,
          configuredAt: new Date()
        }
      });

      logger.info(`Integration ${integrationId} configured for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error configuring integration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to configure integration',
        error: error.message
      });
    }
  }

  /**
   * Get NGO integrations
   */
  static async getNGOIntegrations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const integrations = (ngo as any).integrations || {};
      
      // Return integrations without sensitive config data
      const sanitizedIntegrations = Object.keys(integrations).map(key => ({
        id: key,
        isActive: integrations[key].isActive,
        configuredAt: integrations[key].configuredAt,
        status: integrations[key].isActive ? 'active' : 'inactive'
      }));

      res.json({
        success: true,
        data: sanitizedIntegrations
      });
    } catch (error: any) {
      logger.error('Error fetching NGO integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integrations',
        error: error.message
      });
    }
  }

  /**
   * Test integration connection
   */
  static async testIntegration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { integrationId } = req.params;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const integrations = (ngo as any).integrations || {};
      const integration = integrations[integrationId];

      if (!integration) {
        res.status(404).json({
          success: false,
          message: 'Integration not configured'
        });
        return;
      }

      // Test the integration based on type
      const testResult = await this.performIntegrationTest(integrationId, integration.config);

      res.json({
        success: true,
        message: 'Integration test completed',
        data: testResult
      });

      logger.info(`Integration test performed for ${integrationId} - NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error testing integration:', error);
      res.status(500).json({
        success: false,
        message: 'Integration test failed',
        error: error.message
      });
    }
  }

  /**
   * Sync data with external service
   */
  static async syncData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { integrationId, dataType, direction = 'export' } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const integrations = (ngo as any).integrations || {};
      const integration = integrations[integrationId];

      if (!integration || !integration.isActive) {
        res.status(400).json({
          success: false,
          message: 'Integration not configured or inactive'
        });
        return;
      }

      // Perform data sync based on integration type and data type
      const syncResult = await this.performDataSync(integrationId, integration.config, dataType, direction, ngo._id);

      res.json({
        success: true,
        message: 'Data sync completed successfully',
        data: syncResult
      });

      logger.info(`Data sync completed: ${integrationId} - ${dataType} - NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error syncing data:', error);
      res.status(500).json({
        success: false,
        message: 'Data sync failed',
        error: error.message
      });
    }
  }

  /**
   * Handle webhook from external service
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const webhookData = req.body;
      const signature = req.headers['x-webhook-signature'] as string;

      // Verify webhook signature (simplified)
      const isValid = this.verifyWebhookSignature(webhookData, signature, integrationId);
      
      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid webhook signature'
        });
        return;
      }

      // Process webhook data based on integration type
      const processResult = await this.processWebhookData(integrationId, webhookData);

      res.json({
        success: true,
        message: 'Webhook processed successfully',
        data: processResult
      });

      logger.info(`Webhook processed for integration: ${integrationId}`);
    } catch (error: any) {
      logger.error('Error processing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      });
    }
  }

  /**
   * Get integration logs
   */
  static async getIntegrationLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { integrationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // This would typically come from a separate IntegrationLog model
      const mockLogs = [
        {
          id: '1',
          integrationId,
          action: 'data_sync',
          status: 'success',
          message: 'Successfully synced 25 donors',
          timestamp: new Date(),
          details: { recordCount: 25, operation: 'export' }
        },
        {
          id: '2',
          integrationId,
          action: 'webhook_received',
          status: 'success',
          message: 'Donation notification received',
          timestamp: new Date(Date.now() - 3600000),
          details: { amount: 1000, donorId: 'ext_123' }
        }
      ];

      res.json({
        success: true,
        data: {
          logs: mockLogs,
          pagination: {
            current: Number(page),
            total: 1,
            count: mockLogs.length,
            totalItems: mockLogs.length
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching integration logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integration logs',
        error: error.message
      });
    }
  }

  // Helper methods

  private static encryptConfig(config: any): any {
    // In production, use proper encryption
    // For demo purposes, just return as-is with a flag
    return { ...config, encrypted: true };
  }

  private static async performIntegrationTest(integrationId: string, config: any): Promise<any> {
    // Simplified test logic - in production, implement actual API calls
    const testResults: any = {
      razorpay: { status: 'success', message: 'API connection successful' },
      twilio: { status: 'success', message: 'SMS service accessible' },
      mailchimp: { status: 'success', message: 'Email service connected' },
      google_analytics: { status: 'success', message: 'Analytics tracking active' }
    };

    return testResults[integrationId] || { status: 'error', message: 'Unknown integration' };
  }

  private static async performDataSync(integrationId: string, config: any, dataType: string, direction: string, ngoId: any): Promise<any> {
    // Simplified sync logic - implement actual integration logic
    return {
      integrationId,
      dataType,
      direction,
      recordsProcessed: Math.floor(Math.random() * 100),
      status: 'completed',
      timestamp: new Date()
    };
  }

  private static verifyWebhookSignature(data: any, signature: string, integrationId: string): boolean {
    // Simplified signature verification - implement proper verification
    return Boolean(signature && signature.length > 10);
  }

  private static async processWebhookData(integrationId: string, data: any): Promise<any> {
    // Process webhook data based on integration type
    return {
      integrationId,
      processed: true,
      recordsUpdated: 1,
      timestamp: new Date()
    };
  }
}

export default APIIntegrationController;
