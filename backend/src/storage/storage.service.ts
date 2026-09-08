import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { optionalEnv } from '../common/env';
import { describeError } from '../common/errors';

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
  private client: ReturnType<typeof createClient> | null = null;

  /**
   * El cliente de Supabase se crea al primer uso, no al arrancar.
   *
   * `createClient` puede lanzar (p. ej. en Node 20, donde falta el WebSocket
   * nativo que necesita su módulo de realtime). Si eso pasara en el
   * constructor, Nest no podría instanciar el módulo y se caería el servicio
   * entero: el CRM, el login y todo. Así, un problema de almacenamiento solo
   * rompe la subida de imágenes.
   */
  private getClient(): ReturnType<typeof createClient> {
    if (this.client) return this.client;

    const url = optionalEnv('SUPABASE_URL');
    const key = optionalEnv('SUPABASE_KEY');
    if (!url || !key) {
      throw new BadRequestException(
        'El almacenamiento de imágenes no está configurado (falta SUPABASE_URL o SUPABASE_KEY).',
      );
    }

    try {
      this.client = createClient(url, key);
      return this.client;
    } catch (error: unknown) {
      this.logger.error(
        `No se pudo inicializar Supabase: ${describeError(error)}`,
      );
      throw new BadRequestException(
        'El almacenamiento de imágenes no está disponible.',
      );
    }
  }

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

    const supabase = this.getClient();
    const path = `${userId}/${randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000',
      });

    if (error) {
      this.logger.error(`Error subiendo imagen a Supabase: ${error.message}`);
      throw new BadRequestException('No se pudo subir la imagen.');
    }

    return supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }
}
