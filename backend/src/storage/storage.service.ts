import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
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
  private validateImageMimeType(mimetype: string): void {
    if (!ALLOWED_MIME_TYPES[mimetype]) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Usa uno de: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}.`,
      );
    }
  }

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
  async uploadImage(
    file: { buffer: Buffer; mimetype: string },
    fileName: string,
  ): Promise<string> {
    // Convierte SIEMPRE a JPG (Meta no acepta WEBP en la API)
    const sharp = (await import('sharp')).default;
    const jpgBuffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();

    const supabase = this.getClient();
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(fileName, jpgBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    return supabase.storage.from(this.bucket).getPublicUrl(fileName).data
      .publicUrl;
  }

  /**
   * Borra una imagen a partir de su URL publica.
   *
   * Se usa para limpiar cuando la escritura en base de datos falla despues de
   * haber subido el archivo, y para no acumular la imagen antigua de un
   * producto al reemplazarla. Es best-effort: si falla, se registra y ya, no
   * tiene sentido tumbar la operacion principal por un archivo huerfano.
   */
  async removeImage(publicUrl: string): Promise<void> {
    const marker = `/object/public/${this.bucket}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;

    const path = publicUrl.slice(index + marker.length);
    if (!path) return;

    try {
      const { error } = await this.getClient()
        .storage.from(this.bucket)
        .remove([path]);
      if (error) {
        this.logger.warn(
          `No se pudo borrar la imagen ${path}: ${error.message}`,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo borrar la imagen ${path}: ${describeError(error)}`,
      );
    }
  }
}
