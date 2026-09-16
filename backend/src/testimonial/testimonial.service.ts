import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedImage } from '../storage/storage.service';

@Injectable()
export class TestimonialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  getTestimonials(userId: string) {
    return this.prisma.testimonial.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTestimonial(
    userId: string,
    data: { title: string; content: string; productId?: string },
    file: UploadedImage | undefined,
  ) {
    if (data.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: data.productId, userId },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException(
          'El producto no existe o no te pertenece.',
        );
      }
    }

    let imageUrl: string | undefined = undefined;
    if (file) {
      const fileName = `testimonio-${Date.now()}`;
      imageUrl = await this.storageService.uploadImage(file, fileName);
    }

    return this.prisma.testimonial.create({
      data: {
        title: data.title,
        content: data.content,
        imageUrl,
        productId: data.productId || null,
        userId,
      },
    });
  }

  async deleteTestimonial(userId: string, id: string) {
    const result = await this.prisma.testimonial.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Testimonio no encontrado');
    }
    return { deleted: true, id };
  }
}
