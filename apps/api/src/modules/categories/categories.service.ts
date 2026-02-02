import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, flat = false) {
    const categories = await this.prisma.category.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (flat) {
      return categories.map((cat) => ({
        ...cat,
        itemCount: cat._count.items,
        _count: undefined,
      }));
    }

    // Build tree structure
    return this.buildTree(categories);
  }

  private buildTree(categories: any[], parentId: string | null = null): any[] {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => ({
        ...cat,
        itemCount: cat._count.items,
        _count: undefined,
        children: this.buildTree(categories, cat.id),
      }));
  }

  async findById(id: string, organizationId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { items: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      ...category,
      itemCount: category._count.items,
      _count: undefined,
    };
  }

  async create(organizationId: string, createDto: CreateCategoryDto) {
    // Validate parent if provided
    if (createDto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: createDto.parentId, organizationId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    // Check for duplicate name at same level
    const existing = await this.prisma.category.findFirst({
      where: {
        organizationId,
        name: createDto.name,
        parentId: createDto.parentId || null,
      },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists at this level');
    }

    return this.prisma.category.create({
      data: {
        ...createDto,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, updateDto: UpdateCategoryDto) {
    const category = await this.findById(id, organizationId);

    // Check for circular reference if parentId is being updated
    if (updateDto.parentId !== undefined) {
      if (updateDto.parentId === id) {
        throw new BadRequestException('Circular reference not allowed');
      }

      if (updateDto.parentId) {
        // Check if new parent is a descendant of this category
        const isDescendant = await this.isDescendant(updateDto.parentId, id, organizationId);
        if (isDescendant) {
          throw new BadRequestException('Circular reference not allowed');
        }

        // Validate parent exists
        const parent = await this.prisma.category.findFirst({
          where: { id: updateDto.parentId, organizationId },
        });
        if (!parent) {
          throw new BadRequestException('Parent category not found');
        }
      }
    }

    // Check for duplicate name at same level
    if (updateDto.name) {
      const targetParentId = updateDto.parentId !== undefined ? updateDto.parentId : category.parentId;
      const existing = await this.prisma.category.findFirst({
        where: {
          organizationId,
          name: updateDto.name,
          parentId: targetParentId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists at this level');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateDto,
    });
  }

  private async isDescendant(
    categoryId: string,
    potentialAncestorId: string,
    organizationId: string
  ): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, organizationId },
    });

    if (!category) return false;
    if (category.parentId === potentialAncestorId) return true;
    if (!category.parentId) return false;

    return this.isDescendant(category.parentId, potentialAncestorId, organizationId);
  }

  async delete(id: string, organizationId: string) {
    const category = await this.findById(id, organizationId);

    // Check for items
    if (category.itemCount > 0) {
      throw new BadRequestException('Cannot delete category with items');
    }

    // Check for children
    const childCount = await this.prisma.category.count({
      where: { parentId: id, organizationId },
    });

    if (childCount > 0) {
      throw new BadRequestException('Cannot delete category with children');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }
}
