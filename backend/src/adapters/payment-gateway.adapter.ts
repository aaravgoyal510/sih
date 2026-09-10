import { prisma } from '../config/prisma';
import { PaymentStatus } from '@prisma/client';

export interface PaymentInitiationResult {
  paymentRef: string;
  bookingId: string;
  amount: number;
  paymentStatus: PaymentStatus;
  gatewayProvider: string;
  redirectUrl?: string;
  createdAt: string;
}

export interface PaymentGatewayAdapter {
  initiate(bookingId: string, amount: number): Promise<PaymentInitiationResult>;
  getStatus(bookingId: string): Promise<PaymentInitiationResult>;
  updateStatus(bookingId: string, status: PaymentStatus): Promise<PaymentInitiationResult>;
}

export class StubPaymentGatewayAdapter implements PaymentGatewayAdapter {
  /**
   * Initiates payment for a Booking.
   * Sets Booking.paymentStatus to PENDING and stores totalAmount on Booking.
   */
  async initiate(bookingId: string, amount: number): Promise<PaymentInitiationResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error(`Booking not found with ID: ${bookingId}`);
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: amount,
      },
    });

    // Write a PortalSyncLog entry for Tier 3 Payment Gateway (audit trace)
    await prisma.portalSyncLog.create({
      data: {
        portal: 'PAYMENT_GW',
        tier: 3,
        status: 'STUBBED',
        message: `Payment initiated for Booking ${bookingId}: Amount Rs ${amount}`,
      },
    });

    const paymentRef = `PAY_STUB_${Date.now()}_${bookingId.slice(0, 8)}`;

    return {
      paymentRef,
      bookingId,
      amount: updatedBooking.totalAmount ?? amount,
      paymentStatus: updatedBooking.paymentStatus,
      gatewayProvider: 'STUB_PAYMENT_GATEWAY',
      redirectUrl: `https://checkout.mahamarket.gov.in/stub-pay?ref=${paymentRef}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches current payment status and total transaction amount of a booking
   */
  async getStatus(bookingId: string): Promise<PaymentInitiationResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { offer: true },
    });

    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    return {
      paymentRef: `PAY_STUB_${booking.id.slice(0, 8)}`,
      bookingId: booking.id,
      amount: booking.totalAmount ?? booking.offer.price,
      paymentStatus: booking.paymentStatus,
      gatewayProvider: 'STUB_PAYMENT_GATEWAY',
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Simulates webhook / status transition (PENDING -> ESCROWED -> RELEASED)
   */
  async updateStatus(bookingId: string, status: PaymentStatus): Promise<PaymentInitiationResult> {
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: status },
      include: { offer: true },
    });

    await prisma.portalSyncLog.create({
      data: {
        portal: 'PAYMENT_GW',
        tier: 3,
        status: 'STUBBED',
        message: `Payment status updated to ${status} for Booking ${bookingId}`,
      },
    });

    return {
      paymentRef: `PAY_STUB_${updatedBooking.id.slice(0, 8)}`,
      bookingId: updatedBooking.id,
      amount: updatedBooking.totalAmount ?? updatedBooking.offer.price,
      paymentStatus: updatedBooking.paymentStatus,
      gatewayProvider: 'STUB_PAYMENT_GATEWAY',
      createdAt: new Date().toISOString(),
    };
  }
}

export const paymentGatewayAdapter = new StubPaymentGatewayAdapter();
