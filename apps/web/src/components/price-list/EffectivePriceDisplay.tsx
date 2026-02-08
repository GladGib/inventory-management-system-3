'use client';

import { Tag, Tooltip, Spin, Typography } from 'antd';
import { useEffectivePrice } from '@/hooks/use-price-lists';

const { Text } = Typography;

interface EffectivePriceDisplayProps {
  itemId: string;
  contactId?: string;
  quantity?: number;
  showSource?: boolean;
}

/**
 * EffectivePriceDisplay - Shows effective price for an item
 * based on a contact's assigned price list and quantity.
 *
 * Usage:
 * <EffectivePriceDisplay itemId="..." contactId="..." quantity={10} />
 */
export function EffectivePriceDisplay({
  itemId,
  contactId,
  quantity,
  showSource = true,
}: EffectivePriceDisplayProps) {
  const { data, isLoading } = useEffectivePrice(itemId, contactId, quantity);

  if (isLoading) {
    return <Spin size="small" />;
  }

  if (!data) {
    return <Text type="secondary">-</Text>;
  }

  const isDiscounted = data.effectivePrice < data.standardPrice;
  const isMarkedUp = data.effectivePrice > data.standardPrice;

  const sourceLabels: Record<string, string> = {
    STANDARD: 'Standard price',
    PRICE_LIST_ITEM: `From: ${data.priceListName || 'Price List'}`,
    PRICE_LIST_MARKUP: `Markup: ${data.priceListName || 'Price List'}`,
  };

  return (
    <Tooltip title={showSource ? sourceLabels[data.source] : undefined}>
      <span>
        <Text strong style={{ fontSize: 14 }}>
          RM {data.effectivePrice.toFixed(2)}
        </Text>
        {data.source !== 'STANDARD' && (
          <>
            {isDiscounted && (
              <Tag color="green" style={{ marginLeft: 4, fontSize: 11 }}>
                -{((1 - data.effectivePrice / data.standardPrice) * 100).toFixed(1)}%
              </Tag>
            )}
            {isMarkedUp && (
              <Tag color="orange" style={{ marginLeft: 4, fontSize: 11 }}>
                +{((data.effectivePrice / data.standardPrice - 1) * 100).toFixed(1)}%
              </Tag>
            )}
            {data.effectivePrice !== data.standardPrice && (
              <Text type="secondary" delete style={{ fontSize: 12, marginLeft: 4 }}>
                RM {data.standardPrice.toFixed(2)}
              </Text>
            )}
          </>
        )}
      </span>
    </Tooltip>
  );
}
