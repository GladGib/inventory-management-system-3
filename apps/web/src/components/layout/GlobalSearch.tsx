'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Input,
  Modal,
  Typography,
  Tag,
  Empty,
  Spin,
  Divider,
  Space,
} from 'antd';
import {
  SearchOutlined,
  ShoppingOutlined,
  TeamOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useGlobalSearch } from '@/hooks/use-search';
import type { SearchItemResult, SearchContactResult } from '@/lib/search';

const { Text } = Typography;

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Full search results
  const { data: searchResults, isLoading } = useGlobalSearch(debouncedQuery, {
    type: 'all',
    limit: 5,
    enabled: open && debouncedQuery.length >= 2,
  });

  // Build a flat list of all results for keyboard navigation
  const flatResults: Array<{
    type: 'item' | 'contact';
    id: string;
    label: string;
    sublabel: string;
    href: string;
  }> = [];

  if (searchResults?.results?.items?.data) {
    for (const item of searchResults.results.items.data) {
      flatResults.push({
        type: 'item',
        id: item.id,
        label: item.name,
        sublabel: `${item.sku}${item.category ? ' - ' + item.category : ''}`,
        href: `/items/${item.id}`,
      });
    }
  }

  if (searchResults?.results?.contacts?.data) {
    for (const contact of searchResults.results.contacts.data) {
      flatResults.push({
        type: 'contact',
        id: contact.id,
        label: contact.companyName,
        sublabel: `${contact.displayName}${contact.phone ? ' - ' + contact.phone : ''}`,
        href: `/contacts/${contact.id}`,
      });
    }
  }

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults.length, debouncedQuery]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the modal has rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation within the modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatResults.length - 1,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          navigateTo(flatResults[selectedIndex].href);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [flatResults, selectedIndex],
  );

  const navigateTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemResults = searchResults?.results?.items;
  const contactResults = searchResults?.results?.contacts;
  const hasResults =
    (itemResults && itemResults.data.length > 0) ||
    (contactResults && contactResults.data.length > 0);
  const hasQuery = debouncedQuery.length >= 2;

  // Track cumulative index for highlighting
  let cumulativeIndex = 0;

  return (
    <>
      {/* Search trigger button */}
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          cursor: 'pointer',
          color: '#8c8c8c',
          fontSize: 14,
          background: '#fafafa',
          minWidth: 220,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#1890ff';
          e.currentTarget.style.background = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d9d9d9';
          e.currentTarget.style.background = '#fafafa';
        }}
      >
        <SearchOutlined style={{ fontSize: 14 }} />
        <span style={{ flex: 1 }}>Search...</span>
        <span
          style={{
            fontSize: 11,
            color: '#bfbfbf',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: '1px 6px',
            lineHeight: '18px',
            fontFamily: 'monospace',
          }}
        >
          {typeof navigator !== 'undefined' &&
          /Mac|iPhone|iPad/.test(navigator.userAgent)
            ? '\u2318K'
            : 'Ctrl+K'}
        </span>
      </div>

      {/* Search modal */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={640}
        style={{ top: 80 }}
        styles={{
          body: { padding: 0 },
        }}
        destroyOnClose
      >
        <div onKeyDown={handleKeyDown}>
          {/* Search input */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Input
              ref={inputRef as any}
              prefix={<SearchOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />}
              placeholder="Search items, contacts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              variant="borderless"
              size="large"
              style={{ fontSize: 16 }}
              allowClear
            />
          </div>

          {/* Results */}
          <div
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            {isLoading && hasQuery && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Spin size="default" />
              </div>
            )}

            {!isLoading && hasQuery && !hasResults && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary">
                    No results found for &quot;{debouncedQuery}&quot;
                  </Text>
                }
                style={{ padding: '32px 0' }}
              />
            )}

            {!hasQuery && !isLoading && (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Text type="secondary">
                  Type at least 2 characters to search across items and contacts
                </Text>
              </div>
            )}

            {/* Item results */}
            {itemResults && itemResults.data.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '4px 16px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    type="secondary"
                    strong
                    style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    <ShoppingOutlined style={{ marginRight: 6 }} />
                    Items ({itemResults.total})
                  </Text>
                </div>
                {itemResults.data.map((item: SearchItemResult) => {
                  const idx = cumulativeIndex++;
                  return (
                    <div
                      key={`item-${item.id}`}
                      onClick={() => navigateTo(`/items/${item.id}`)}
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background:
                          idx === selectedIndex ? '#e6f4ff' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        setSelectedIndex(idx);
                        e.currentTarget.style.background = '#e6f4ff';
                      }}
                      onMouseLeave={(e) => {
                        if (idx !== selectedIndex) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#f0f5ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ShoppingOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text
                            strong
                            style={{
                              fontSize: 14,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </Text>
                          <Tag
                            style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}
                            color="blue"
                          >
                            {item.sku}
                          </Tag>
                        </div>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {[item.category, item.brand].filter(Boolean).join(' - ') ||
                            item.type}
                        </Text>
                      </div>
                      {item.sellingPrice != null && (
                        <Text style={{ fontSize: 13, color: '#52c41a', flexShrink: 0 }}>
                          RM {Number(item.sellingPrice).toFixed(2)}
                        </Text>
                      )}
                      <RightOutlined
                        style={{ color: '#d9d9d9', fontSize: 10, flexShrink: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Divider between sections */}
            {itemResults &&
              itemResults.data.length > 0 &&
              contactResults &&
              contactResults.data.length > 0 && (
                <Divider style={{ margin: '4px 0' }} />
              )}

            {/* Contact results */}
            {contactResults && contactResults.data.length > 0 && (
              <div>
                <div
                  style={{
                    padding: '4px 16px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    type="secondary"
                    strong
                    style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    <TeamOutlined style={{ marginRight: 6 }} />
                    Contacts ({contactResults.total})
                  </Text>
                </div>
                {contactResults.data.map((contact: SearchContactResult) => {
                  const idx = cumulativeIndex++;
                  return (
                    <div
                      key={`contact-${contact.id}`}
                      onClick={() => navigateTo(`/contacts/${contact.id}`)}
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background:
                          idx === selectedIndex ? '#e6f4ff' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        setSelectedIndex(idx);
                        e.currentTarget.style.background = '#e6f4ff';
                      }}
                      onMouseLeave={(e) => {
                        if (idx !== selectedIndex) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#f6ffed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <TeamOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text
                            strong
                            style={{
                              fontSize: 14,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {contact.companyName}
                          </Text>
                          <Tag
                            style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}
                            color={
                              contact.type === 'CUSTOMER'
                                ? 'green'
                                : contact.type === 'VENDOR'
                                  ? 'orange'
                                  : 'purple'
                            }
                          >
                            {contact.type}
                          </Tag>
                        </div>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {[contact.displayName, contact.email, contact.phone]
                            .filter(Boolean)
                            .join(' - ')}
                        </Text>
                      </div>
                      <RightOutlined
                        style={{ color: '#d9d9d9', fontSize: 10, flexShrink: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          {hasResults && (
            <div
              style={{
                padding: '8px 16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <Space size={4}>
                <span
                  style={{
                    fontSize: 11,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontFamily: 'monospace',
                    background: '#fafafa',
                  }}
                >
                  {'\u2191'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontFamily: 'monospace',
                    background: '#fafafa',
                  }}
                >
                  {'\u2193'}
                </span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>
                  Navigate
                </Text>
              </Space>
              <Space size={4}>
                <span
                  style={{
                    fontSize: 11,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontFamily: 'monospace',
                    background: '#fafafa',
                  }}
                >
                  {'\u23CE'}
                </span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>
                  Open
                </Text>
              </Space>
              <Space size={4}>
                <span
                  style={{
                    fontSize: 11,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontFamily: 'monospace',
                    background: '#fafafa',
                  }}
                >
                  Esc
                </span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>
                  Close
                </Text>
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
