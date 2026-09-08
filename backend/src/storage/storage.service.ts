import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { requireEnv, optionalEnv } from '../common/env';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  size?: number;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = optionalEnv('SUPABASE_BUCKET', 'cj7-productos');
  private readonly supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_KEY'),
  );

  /**
   * Sube una imagen y devuelve su URL pública.
   *
   * El nombre lo genera el servidor (uuid) y la extensión sale del mimetype
   * validado: así nadie sube un .html o sobrescribe la imagen de otro producto
   * eligiendo el nombre de archivo.
   */
  async uploadImage(file: UploadedImage, userId: string): Promise<string> {
    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.',
      );
    }

    const size = file.size ?? file.buffer.length;
    if (size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('La imagen no puede pesar más de 5 MB.');
    }

    const path = `${userId}/${randomUUID()}.${extension}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000',
      });

    if (error) {
      this.logger.error(`Error subiendo imagen a Supabase: ${error.message}`);
      throw new BadRequestException('No se pudo subir la imagen.');
    }

    return this.supabase.storage.from(this.bucket).getPublicUrl(path).data
      .publicUrl;
  }
}
