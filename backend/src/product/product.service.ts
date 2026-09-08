import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedImage } from '../storage/storage.service';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

/**
 * Convierte un campo numérico del formulario.
 *
 * Los DTO solo garantizan que el texto sea numérico (@IsNumberString), no que
 * el número tenga sentido: "-5" pasa la validación. Aquí se rechazan los
 * negativos, que no significan nada ni en un precio ni en un stock.
 *
 * Devuelve null cuando el campo viene vacío, para que Prisma guarde NULL en
 * vez de un 0 que el usuario nunca escribió.
 */
function parseAmount(
  value: string | undefined,
  label: string,
  { integer = false }: { integer?: boolean } = {},
): number | null {
  if (value === undefined || value.trim() === '') return null;

  const parsed = integer
    ? Number.parseInt(value, 10)
    : Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`${label} debe ser un número.`);
  }
  if (parsed < 0) {
    throw new BadRequestException(`${label} no puede ser negativo.`);
  }
  return parsed;
}

/** Precio: mismo tratamiento, pero es obligatorio y no admite null. */
function parseRequiredPrice(value: string): number {
  const price = parseAmount(value, 'El precio');
  if (price === null) {
    throw new BadRequestException('El precio es obligatorio.');
  }
  return price;
}

/** Cadena vacía -> null, para no guardar "" en columnas opcionales. */
function orNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  getProducts(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(
    userId: string,
    data: CreateProductDto,
    file: UploadedImage | undefined,
  ) {
    // Los números se validan ANTES de subir nada: si el formulario viene mal,
    // no tiene sentido gastar una subida a Supabase.
    const price = parseRequiredPrice(data.price);
    const offerPrice = parseAmount(data.offerPrice, 'El precio de oferta');
    const cost = parseAmount(data.cost, 'El costo');
    const stock = parseAmount(data.stock, 'El stock', { integer: true }) ?? 0;
    const minStock =
      parseAmount(data.minStock, 'El stock mínimo', { integer: true }) ?? 0;

    const imageUrl = file
      ? await this.storageService.uploadImage(file, userId)
      : undefined;

    try {
      return await this.prisma.product.create({
        data: {
          name: data.name.trim(),
          description: orNull(data.description),
          category: orNull(data.category),
          sku: data.sku.trim(),
          price,
          offerPrice,
          cost,
          stock,
          minStock,
          imageUrl,
          status: data.status ?? 'Activo',
          userId,
        },
      });
    } catch (error: unknown) {
      // La imagen ya está subida; si el insert falla quedaría huérfana en
      // Supabase para siempre, ocupando espacio que nadie puede ver ni borrar.
      if (imageUrl) await this.storageService.removeImage(imageUrl);

      if (isUniqueConstraintError(error)) {
        throw new BadRequestException('Ya tienes un producto con ese SKU.');
      }
      throw error;
    }
  }

  async updateProduct(
    userId: string,
    id: string,
    data: UpdateProductDto,
    file: UploadedImage | undefined,
  ) {
    const existing = await this.prisma.product.findFirst({
      where: { id, userId },
      select: { id: true, imageUrl: true },
    });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    // undefined = el campo no venía en la petición, así que no se toca.
    const price =
      data.price !== undefined ? parseRequiredPrice(data.price) : undefined;
    const offerPrice =
      data.offerPrice !== undefined
        ? parseAmount(data.offerPrice, 'El precio de oferta')
        : undefined;
    const cost =
      data.cost !== undefined ? parseAmount(data.cost, 'El costo') : undefined;
    const stock =
      data.stock !== undefined
        ? (parseAmount(data.stock, 'El stock', { integer: true }) ?? 0)
        : undefined;
    const minStock =
      data.minStock !== undefined
        ? (parseAmount(data.minStock, 'El stock mínimo', { integer: true }) ??
          0)
        : undefined;

    // Solo reemplazamos la imagen si suben una nueva; si no, se conserva.
    const newImageUrl = file
      ? await this.storageService.uploadImage(file, userId)
      : undefined;

    try {
      const updated = await this.prisma.product.update({
        // La propiedad ya se comprobó arriba con findFirst({ id, userId }).
        where: { id },
        data: {
          name: data.name?.trim(),
          description: orNull(data.description),
          category: orNull(data.category),
          sku: data.sku?.trim(),
          price,
          offerPrice,
          cost,
          stock,
          minStock,
          imageUrl: newImageUrl,
          status: data.status,
        },
      });

      // La imagen anterior ya no la referencia nadie.
      if (newImageUrl && existing.imageUrl) {
        await this.storageService.removeImage(existing.imageUrl);
      }

      return updated;
    } catch (error: unknown) {
      if (newImageUrl) await this.storageService.removeImage(newImageUrl);

      if (isUniqueConstraintError(error)) {
        throw new BadRequestException('Ya tienes un producto con ese SKU.');
      }
      throw error;
    }
  }

  async deleteProduct(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      select: { id: true, imageUrl: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    // deleteMany en vez de delete: filtra otra vez por userId y, si el registro
    // desaparecio entre la consulta y el borrado, devuelve count 0 en lugar de
    // lanzar un P2025 que acabaria en un 500.
    const result = await this.prisma.product.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.imageUrl) {
      await this.storageService.removeImage(product.imageUrl);
    }

    return { deleted: true, id };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
