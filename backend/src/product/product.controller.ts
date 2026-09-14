import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import {
  MAX_VIDEO_BYTES,
  type UploadedImage,
} from '../storage/storage.service';

// Nest ya traduce los errores de multer a HttpException, asi que pasarse del
const imageUpload = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'extraImages', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ],
  {
    limits: { fileSize: MAX_VIDEO_BYTES, files: 7 },
  },
);

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
    @UploadedFiles()
    files: {
      file?: UploadedImage[];
      extraImages?: UploadedImage[];
      video?: UploadedImage[];
    },
  ) {
    return this.productService.createProduct(
      user.id,
      body,
      files.file?.[0],
      files.extraImages,
      files.video?.[0],
    );
  }

  @Put(':id')
  @UseInterceptors(imageUpload)
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @UploadedFiles()
    files: {
      file?: UploadedImage[];
      extraImages?: UploadedImage[];
      video?: UploadedImage[];
    },
  ) {
    return this.productService.updateProduct(
      user.id,
      id,
      body,
      files.file?.[0],
      files.extraImages,
      files.video?.[0],
    );
  }

  @Delete(':id')
  deleteProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productService.deleteProduct(user.id, id);
  }
}
