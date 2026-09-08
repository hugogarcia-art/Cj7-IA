import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_KEY ?? '',
  );

  async uploadImage(
    file: { buffer: Buffer; mimetype: string },
    fileName: string,
  ) {
    const uploadResult = await this.supabase.storage
      .from('cj7-productos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadResult.error) throw uploadResult.error;

    // Devolvemos la URL pública de la imagen
    const publicUrlResponse = this.supabase.storage
      .from('cj7-productos')
      .getPublicUrl(fileName);

    return publicUrlResponse.data.publicUrl;
  }
}
