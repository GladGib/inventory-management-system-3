import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  sound?: 'default' | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register or update a device push token for a user.
   */
  async registerDevice(
    userId: string,
    organizationId: string,
    token: string,
    platform: string,
    deviceName?: string,
  ) {
    return this.prisma.deviceToken.upsert({
      where: {
        token_userId: { token, userId },
      },
      update: {
        platform,
        deviceName,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        token,
        platform,
        deviceName,
        userId,
        organizationId,
        isActive: true,
      },
    });
  }

  /**
   * Unregister (deactivate) a device push token.
   */
  async unregisterDevice(userId: string, token: string) {
    return this.prisma.deviceToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  /**
   * Send a push notification to a specific user via all their registered devices.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    channelId?: string,
  ): Promise<void> {
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.debug(`No active devices found for user ${userId}`);
      return;
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.token,
      title,
      body,
      data,
      channelId,
      sound: 'default' as const,
    }));

    await this.sendExpoPushNotifications(messages);
  }

  /**
   * Send a push notification to all users in an organization.
   */
  async sendOrganizationNotification(
    organizationId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    channelId?: string,
  ): Promise<void> {
    const devices = await this.prisma.deviceToken.findMany({
      where: { organizationId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.debug(
        `No active devices found for organization ${organizationId}`,
      );
      return;
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.token,
      title,
      body,
      data,
      channelId,
      sound: 'default' as const,
    }));

    await this.sendExpoPushNotifications(messages);
  }

  /**
   * Send a low stock alert to all users in the item's organization.
   */
  async sendLowStockAlert(
    organizationId: string,
    itemName: string,
    currentStock: number,
  ): Promise<void> {
    await this.sendOrganizationNotification(
      organizationId,
      'Low Stock Alert',
      `${itemName} is running low. Current stock: ${currentStock} units.`,
      { type: 'LOW_STOCK', itemName, currentStock },
      'inventory',
    );
  }

  /**
   * Send an order status update notification.
   */
  async sendOrderNotification(
    organizationId: string,
    orderType: 'SALES' | 'PURCHASE',
    orderId: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    const typeLabel =
      orderType === 'SALES' ? 'Sales Order' : 'Purchase Order';
    const statusLabel = status.replace(/_/g, ' ');

    await this.sendOrganizationNotification(
      organizationId,
      `${typeLabel} Updated`,
      `${typeLabel} #${orderNumber} status changed to ${statusLabel}.`,
      { type: 'ORDER_UPDATE', orderType, orderId, orderNumber, status },
      'orders',
    );
  }

  /**
   * Get notification history for a user. Uses audit logs filtered to
   * notification-related actions as a lightweight notification history.
   * A dedicated NotificationLog table can be added later for richer features.
   */
  async getNotificationHistory(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          action: {
            in: [
              'LOW_STOCK_ALERT',
              'ORDER_NOTIFICATION',
              'PUSH_NOTIFICATION',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: {
          organizationId,
          action: {
            in: [
              'LOW_STOCK_ALERT',
              'ORDER_NOTIFICATION',
              'PUSH_NOTIFICATION',
            ],
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      },
    };
  }

  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------

  /**
   * Send messages via the Expo Push API.
   * Handles chunking (Expo limits to 100 per request).
   */
  private async sendExpoPushNotifications(
    messages: ExpoPushMessage[],
  ): Promise<void> {
    const chunks = this.chunkArray(messages, 100);

    for (const chunk of chunks) {
      try {
        const response = await fetch(this.expoPushUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        const tickets: ExpoPushTicket[] = result.data ?? [];

        // Log any errors and deactivate invalid tokens
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            this.logger.warn(
              `Push notification error for token ${chunk[index]?.to}: ${ticket.message}`,
              ticket.details,
            );

            // Deactivate tokens that are no longer valid
            if (
              ticket.details &&
              (ticket.details as any).error === 'DeviceNotRegistered'
            ) {
              this.deactivateToken(chunk[index].to).catch((err) =>
                this.logger.error('Failed to deactivate token', err),
              );
            }
          }
        });
      } catch (error) {
        this.logger.error('Failed to send Expo push notifications', error);
      }
    }
  }

  /**
   * Mark a device token as inactive (e.g., when device is no longer registered).
   */
  private async deactivateToken(token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Split an array into chunks of the given size.
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
