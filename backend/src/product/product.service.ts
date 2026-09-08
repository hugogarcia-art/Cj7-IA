import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedImage } from '../storage/storage.service';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

function toFloat(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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
    const price = toFloat(data.price);
    if (price === null || price < 0) {
      throw new BadRequestException('El precio no es válido.');
    }

    const imageUrl = file
      ? await this.storageService.uploadImage(file, userId)
      : undefined;

    try {
      return await this.prisma.product.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          sku: data.sku,
          price,
          offerPrice: toFloat(data.offerPrice),
          cost: toFloat(data.cost),
          stock: toInt(data.stock) ?? 0,
          minStock: toInt(data.minStock) ?? 0,
          imageUrl,
          status: data.status ?? 'Activo',
          userId,
        },
      });
    } catch (error: unknown) {
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
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    if (data.price !== undefined) {
      const price = toFloat(data.price);
      if (price === null || price < 0) {
        throw new BadRequestException('El precio no es válido.');
      }
    }

    // Solo reemplazamos la imagen si suben una nueva; si no, se conserva.
    const imageUrl = file
      ? await this.storageService.uploadImage(file, userId)
      : undefined;

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          sku: data.sku,
          price: data.price !== undefined ? toFloat(data.price) : undefined,
          offerPrice:
            data.offerPrice !== undefined
              ? toFloat(data.offerPrice)
              : undefined,
          cost: data.cost !== undefined ? toFloat(data.cost) : undefined,
          stock:
            data.stock !== undefined ? (toInt(data.stock) ?? 0) : undefined,
          minStock:
            data.minStock !== undefined
              ? (toInt(data.minStock) ?? 0)
              : undefined,
          imageUrl,
          status: data.status,
        },
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException('Ya tienes un producto con ese SKU.');
      }
      throw error;
    }
  }

  async deleteProduct(userId: string, id: string) {
    const result = await this.prisma.product.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Producto no encontrado');
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
