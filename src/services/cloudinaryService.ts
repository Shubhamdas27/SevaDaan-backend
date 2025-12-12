import { v2 as cloudinary } from 'cloudinary';
import config from '../config/config';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  transformation?: any[];
}

interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at: string;
}

export class CloudinaryService {
  async uploadFile(
    file: Buffer | string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const defaultOptions = {
        folder: 'sevadaan',
        resource_type: 'auto' as const,
        ...options,
      };

      const result = await cloudinary.uploader.upload(file as string, defaultOptions);
      
      logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
      
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at,
      };
    } catch (error) {
      logger.error('Cloudinary upload failed:', error);
      throw new Error('File upload failed');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const defaultOptions = {
        folder: 'sevadaan',
        resource_type: 'auto' as const,
        ...options,
      };

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          defaultOptions,
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload failed:', error);
              reject(new Error('File upload failed'));
            } else {
              logger.info(`File uploaded to Cloudinary: ${result!.public_id}`);
              resolve({
                public_id: result!.public_id,
                secure_url: result!.secure_url,
                url: result!.url,
                format: result!.format,
                resource_type: result!.resource_type,
                bytes: result!.bytes,
                width: result!.width,
                height: result!.height,
                created_at: result!.created_at,
              });
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      logger.error('Cloudinary upload failed:', error);
      throw new Error('File upload failed');
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      logger.error('Cloudinary delete failed:', error);
      throw new Error('File deletion failed');
    }
  }

  async uploadNGODocument(
    buffer: Buffer,
    ngoId: string,
    documentType: 'pan' | 'registration' | 'certificate' | 'photo',
    originalName: string
  ): Promise<UploadResult> {
    const folder = `sevadaan/ngos/${ngoId}/documents`;
    const public_id = `${documentType}_${Date.now()}`;

    return this.uploadBuffer(buffer, {
      folder,
      public_id,
      resource_type: documentType === 'photo' ? 'image' : 'raw',
    });
  }

  async uploadUserAvatar(
    buffer: Buffer,
    userId: string,
    originalName: string
  ): Promise<UploadResult> {
    const folder = `sevadaan/users/${userId}`;
    const public_id = `avatar_${Date.now()}`;

    return this.uploadBuffer(buffer, {
      folder,
      public_id,
      resource_type: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', format: 'auto' },
      ],
    });
  }

  async uploadProgramImage(
    buffer: Buffer,
    programId: string,
    imageType: 'cover' | 'gallery',
    originalName: string
  ): Promise<UploadResult> {
    const folder = `sevadaan/programs/${programId}`;
    const public_id = `${imageType}_${Date.now()}`;

    return this.uploadBuffer(buffer, {
      folder,
      public_id,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto', format: 'auto' },
      ],
    });
  }

  generateSignedUrl(publicId: string, expiration: number = 3600): string {
    const timestamp = Math.floor(Date.now() / 1000) + expiration;
    
    return cloudinary.utils.private_download_url(publicId, 'jpg', {
      resource_type: 'auto',
      expires_at: timestamp,
    });
  }

  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options.width || 'auto',
          height: options.height || 'auto',
          crop: 'limit',
          quality: options.quality || 'auto',
          format: options.format || 'auto',
        },
      ],
    });
  }
}

export const cloudinaryService = new CloudinaryService();
