'use client';

import React from 'react';
import { Dropdown, Button, type MenuProps } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from '@/providers/LocaleProvider';
import { LOCALE_LABELS, type Locale } from '@/lib/i18n';

interface LanguageSwitcherProps {
  /** Optional style overrides */
  style?: React.CSSProperties;
}

/**
 * Ant Design dropdown toggle for switching between English and Bahasa Malaysia.
 * Reads and updates locale via the LocaleProvider context.
 *
 * Usage:
 * ```tsx
 * <LanguageSwitcher />
 * ```
 */
export function LanguageSwitcher({ style }: LanguageSwitcherProps) {
  const { locale, switchLocale } = useTranslation();

  const menuItems: MenuProps['items'] = [
    {
      key: 'en',
      label: 'English',
      onClick: () => switchLocale('en'),
    },
    {
      key: 'ms',
      label: 'Bahasa Malaysia',
      onClick: () => switchLocale('ms'),
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        selectedKeys: [locale],
      }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<GlobalOutlined style={{ fontSize: 18 }} />}
        style={{
          color: '#595959',
          width: 'auto',
          height: 40,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          ...style,
        }}
      >
        {LOCALE_LABELS[locale as Locale]}
      </Button>
    </Dropdown>
  );
}
