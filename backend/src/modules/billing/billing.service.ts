import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutResponseDto } from './dto/checkout-response.dto';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('app.stripe.secretKey')!,
    );
  }

  async createCheckoutSession(userId: string): Promise<CheckoutResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const premiumPriceId = this.configService.get<string>('app.stripe.premiumPriceId')!;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      line_items: [{ price: premiumPriceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success`,
      cancel_url: `${frontendUrl}/billing/cancel`,
      metadata: { userId: user.id },
    });

    if (!session.url) {
      throw new InternalServerErrorException('Erro ao criar sessão de checkout');
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<CheckoutResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('Usuário não possui assinatura ativa');
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/settings`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('app.stripe.webhookSecret')!;

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook inválido: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        this.logger.warn(`Pagamento falhou: ${(event.data.object as Stripe.Invoice).id}`);
        break;
      default:
        this.logger.log(`Evento ignorado: ${event.type}`);
    }
  }

  // ── Handlers privados ────────────────────────────────────────────────────────

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: Plan.PREMIUM,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        plan: Plan.FREE,
        stripeSubscriptionId: null,
      },
    });
  }
}
