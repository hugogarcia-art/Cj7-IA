import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

interface ProductData {
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  price: string;
  offerPrice?: string;
  cost?: string;
  stock?: string;
  minStock?: string;
  status?: string;
}

@Injectable()
export class ProductService implements OnModuleInit {
  private prisma = new PrismaClient();

  constructor(private readonly storageService: StorageService) {}

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async getProducts() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(
    data: ProductData,
    file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    // Buscamos o creamos el usuario admin para vincular el producto
    let adminUser = await this.prisma.user.findFirst();
    if (!adminUser) {
      adminUser = await this.prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@cj7ia.com',
          password: 'password_seguro_123',
          clientCode: 0,
        },
      });
    }

    // Si viene una imagen, la subimos a Supabase
    let imageUrl: string | undefined = undefined;
    if (file) {
      const fileName = `producto-${Date.now()}.jpg`;
      imageUrl = await this.storageService.uploadImage(file, fileName);
    }

    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        sku: data.sku,
        price: parseFloat(data.price),
        offerPrice: data.offerPrice ? parseFloat(data.offerPrice) : null,
        cost: data.cost ? parseFloat(data.cost) : null,
        stock: parseInt(data.stock) || 0,
        minStock: parseInt(data.minStock) || 0,
        imageUrl: imageUrl,
        status: data.status || 'Activo',
        userId: adminUser.id,
      },
    });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
