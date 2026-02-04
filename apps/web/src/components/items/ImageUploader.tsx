'use client';

import { useState, useCallback } from 'react';
import { Upload, Modal, message, Progress, Typography, Space } from 'antd';
import { InboxOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';

const { Dragger } = Upload;
const { Text } = Typography;

export interface ItemImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  order: number;
}

interface ImageUploaderProps {
  itemId?: string;
  images: ItemImage[];
  maxImages?: number;
  onChange: (images: ItemImage[]) => void;
  disabled?: boolean;
  onUpload?: (file: RcFile) => Promise<ItemImage>;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function ImageUploader({
  images,
  maxImages = 5,
  onChange,
  disabled = false,
  onUpload,
}: ImageUploaderProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileList: UploadFile[] = images.map((img) => ({
    uid: img.id,
    name: img.filename,
    status: 'done',
    url: img.url,
    thumbUrl: img.thumbnailUrl || img.url,
  }));

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || file.thumbUrl || '');
    setPreviewTitle(file.name || 'Image Preview');
    setPreviewOpen(true);
  };

  const handleRemove = (file: UploadFile) => {
    const newImages = images.filter((img) => img.id !== file.uid);
    // Reorder remaining images
    const reordered = newImages.map((img, index) => ({
      ...img,
      order: index,
    }));
    onChange(reordered);
    return true;
  };

  const beforeUpload = (file: RcFile) => {
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error('Only JPEG, PNG, and WebP images are allowed');
      return Upload.LIST_IGNORE;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      message.error('Image must be smaller than 2MB');
      return Upload.LIST_IGNORE;
    }

    // Check max images
    if (images.length >= maxImages) {
      message.error(`Maximum ${maxImages} images allowed`);
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const customRequest = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (options: any) => {
      const { file, onSuccess, onError } = options;

      if (!onUpload) {
        // If no upload handler, create a local preview
        const reader = new FileReader();
        reader.onload = () => {
          const newImage: ItemImage = {
            id: `temp-${Date.now()}`,
            url: reader.result as string,
            filename: file.name,
            order: images.length,
          };
          onChange([...images, newImage]);
          onSuccess?.(newImage);
        };
        reader.onerror = () => {
          onError?.(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const newImage = await onUpload(file);

        clearInterval(progressInterval);
        setUploadProgress(100);

        onChange([...images, newImage]);
        onSuccess?.(newImage);
        message.success('Image uploaded successfully');
      } catch (error) {
        onError?.(error);
        message.error('Failed to upload image');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [images, onChange, onUpload]
  );

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    listType: 'picture-card',
    fileList,
    disabled: disabled || uploading || images.length >= maxImages,
    beforeUpload,
    customRequest,
    onPreview: handlePreview,
    onRemove: handleRemove,
    accept: ACCEPTED_TYPES.join(','),
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: !disabled,
      showDownloadIcon: false,
    },
  };

  return (
    <div>
      {images.length < maxImages && (
        <Dragger {...uploadProps} style={{ marginBottom: 16 }} openFileDialogOnClick={!uploading}>
          <p className="ant-upload-drag-icon">
            {uploading ? (
              <Progress type="circle" percent={uploadProgress} width={48} />
            ) : (
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            )}
          </p>
          <p className="ant-upload-text">
            {uploading ? 'Uploading...' : 'Click or drag image to upload'}
          </p>
          <p className="ant-upload-hint">Support JPEG, PNG, WebP. Max 2MB per image.</p>
        </Dragger>
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary">
          {images.length} of {maxImages} images
          {images.length > 0 && ' (First image is the primary thumbnail)'}
        </Text>

        {images.length === 0 && !uploading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 100,
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
              color: '#999',
            }}
          >
            <Space direction="vertical" align="center">
              <PictureOutlined style={{ fontSize: 32 }} />
              <Text type="secondary">No images uploaded</Text>
            </Space>
          </div>
        )}
      </Space>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width={800}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={previewTitle}
          style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
}
