'use client';

import { useState, useCallback } from 'react';
import { Image, Modal, Typography, Card, Tooltip, Badge, Empty } from 'antd';
import {
  DeleteOutlined,
  ZoomInOutlined,
  StarFilled,
  StarOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ItemImage } from './ImageUploader';

const { Text } = Typography;
const { confirm } = Modal;

interface ImageGalleryProps {
  images: ItemImage[];
  editable?: boolean;
  onReorder?: (images: ItemImage[]) => void;
  onDelete?: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
}

interface SortableImageProps {
  image: ItemImage;
  index: number;
  editable: boolean;
  onDelete?: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
}

function SortableImage({ image, index, editable, onDelete, onSetPrimary }: SortableImageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isPrimary = index === 0;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: !editable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Image',
      content: 'Are you sure you want to delete this image?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDelete?.(image.id),
    });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Badge.Ribbon text="Primary" color="gold" style={{ display: isPrimary ? undefined : 'none' }}>
        <Card
          hoverable
          size="small"
          style={{
            width: 150,
            cursor: editable ? 'grab' : 'default',
          }}
          cover={
            <div style={{ position: 'relative', height: 120 }}>
              <Image
                src={image.thumbnailUrl || image.url}
                alt={image.filename}
                style={{
                  width: '100%',
                  height: 120,
                  objectFit: 'cover',
                }}
                preview={{
                  visible: previewOpen,
                  onVisibleChange: setPreviewOpen,
                  src: image.url,
                }}
              />
              {editable && (
                <div
                  {...attributes}
                  {...listeners}
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    padding: '2px 6px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: 4,
                    cursor: 'grab',
                  }}
                >
                  <HolderOutlined style={{ color: '#fff' }} />
                </div>
              )}
            </div>
          }
          actions={
            editable
              ? [
                  <Tooltip key="preview" title="Preview">
                    <ZoomInOutlined onClick={() => setPreviewOpen(true)} />
                  </Tooltip>,
                  <Tooltip key="primary" title={isPrimary ? 'Primary image' : 'Set as primary'}>
                    {isPrimary ? (
                      <StarFilled style={{ color: '#faad14' }} />
                    ) : (
                      <StarOutlined onClick={() => onSetPrimary?.(image.id)} />
                    )}
                  </Tooltip>,
                  <Tooltip key="delete" title="Delete">
                    <DeleteOutlined style={{ color: '#ff4d4f' }} onClick={handleDelete} />
                  </Tooltip>,
                ]
              : [
                  <Tooltip key="preview" title="Preview">
                    <ZoomInOutlined onClick={() => setPreviewOpen(true)} />
                  </Tooltip>,
                ]
          }
        >
          <Card.Meta
            description={
              <Text ellipsis style={{ fontSize: 12 }}>
                {image.filename}
              </Text>
            }
          />
        </Card>
      </Badge.Ribbon>
    </div>
  );
}

export function ImageGallery({
  images,
  editable = false,
  onReorder,
  onDelete,
  onSetPrimary,
}: ImageGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = images.findIndex((img) => img.id === active.id);
        const newIndex = images.findIndex((img) => img.id === over.id);

        const newImages = arrayMove(images, oldIndex, newIndex).map((img, index) => ({
          ...img,
          order: index,
        }));

        onReorder?.(newImages);
      }
    },
    [images, onReorder]
  );

  const handleSetPrimary = useCallback(
    (imageId: string) => {
      const imageIndex = images.findIndex((img) => img.id === imageId);
      if (imageIndex > 0) {
        const newImages = arrayMove(images, imageIndex, 0).map((img, index) => ({
          ...img,
          order: index,
        }));
        onReorder?.(newImages);
      }
      onSetPrimary?.(imageId);
    },
    [images, onReorder, onSetPrimary]
  );

  if (images.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No images" />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={images.map((img) => img.id)}
        strategy={rectSortingStrategy}
        disabled={!editable}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {images.map((image, index) => (
            <SortableImage
              key={image.id}
              image={image}
              index={index}
              editable={editable}
              onDelete={onDelete}
              onSetPrimary={handleSetPrimary}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
