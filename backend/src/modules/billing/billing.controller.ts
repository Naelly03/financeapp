import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { Public, CurrentUser, JwtPayload } from '../../common/decorators';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiBearerAuth()
  @Post('checkout')
  createCheckout(@CurrentUser() user: JwtPayload): Promise<CheckoutResponseDto> {
    return this.billingService.createCheckoutSession(user.sub);
  }

  @ApiBearerAuth()
  @Post('portal')
  createPortal(@CurrentUser() user: JwtPayload): Promise<CheckoutResponseDto> {
    return this.billingService.createPortalSession(user.sub);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Req() req: RawBodyRequest<Request>): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    return this.billingService.handleWebhook(req.rawBody!, sig);
  }
}
