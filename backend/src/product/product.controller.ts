import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import {
  MAX_IMAGE_BYTES,
  type UploadedImage,
} from '../storage/storage.service';

const imageUpload = FileInterceptor('file', {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  getProducts(@CurrentUser() user: AuthenticatedUser) {
    return this.productService.getProducts(user.id);
  }

  @Post()
  @UseInterceptors(imageUpload)
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductDto,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.productService.createProduct(user.id, body, file);
  }

  @Put(':id')
  @UseInterceptors(imageUpload)
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.productService.updateProduct(user.id, id, body, file);
  }

  @Delete(':id')
  deleteProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.deleteProduct(user.id, id);
  }
}
