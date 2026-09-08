import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getProducts() {
    return this.productService.getProducts();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createProduct(
    @Body() body: Parameters<ProductService['createProduct']>[0],
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    return this.productService.createProduct(body, file);
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
