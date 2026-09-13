import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { TestimonialService } from './testimonial.service';
import {
  MAX_IMAGE_BYTES,
  type UploadedImage,
} from '../storage/storage.service';

const testimonialImageUpload = FileInterceptor('image', {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Get()
  getTestimonials(@CurrentUser() user: AuthenticatedUser) {
    return this.testimonialService.getTestimonials(user.id);
  }

  @Post()
  @UseInterceptors(testimonialImageUpload)
  createTestimonial(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { title: string; content: string; productId?: string },
    @UploadedFile() image: UploadedImage | undefined,
  ) {
    return this.testimonialService.createTestimonial(user.id, body, image);
  }

  @Delete(':id')
  deleteTestimonial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.testimonialService.deleteTestimonial(user.id, id);
  }
}
