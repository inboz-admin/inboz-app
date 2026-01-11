import { Injectable } from '@nestjs/common';
import { IRepository } from '../repository/base.repository';
import { WhereOptions, Transaction } from 'sequelize';

@Injectable()
export abstract class BaseService<T> {
  constructor(protected readonly repository: IRepository<T>) {}

  // Direct access to repository methods
  protected get repo() {
    return this.repository;
  }

  /**
   * Find all entities with pagination and filtering
   */
  async findAll(query?: any, transaction?: Transaction): Promise<any> {
    return this.repository.findAll(query);
  }

  /**
   * Find entity by ID
   */
  async findOne(id: string, transaction?: Transaction): Promise<any> {
    return this.repository.findById(id, transaction);
  }

  /**
   * Create entity
   */
  async create(
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<T> {
    return this.repository.create(data, transaction, currentUserId);
  }

  /**
   * Update entity
   */
  async update(
    id: string,
    data: Partial<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<T> {
    await this.repository.update(
      { id } as any,
      data,
      transaction,
      currentUserId,
    );
    return this.repository.findById(id, transaction) as Promise<T>;
  }

  /**
   * Remove entity (soft delete) - returns the removed entity
   */
  async remove(id: string): Promise<T> {
    const entity = await this.repository.findById(id);
    await this.repository.delete({ id } as any);
    return entity as T;
  }

  /**
   * Soft delete - Sets deletedAt timestamp (default behavior)
   */
  async softDelete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<number> {
    return this.repository.delete(where, transaction, currentUserId);
  }

  /**
   * Hard delete - Permanently removes from database (admin only)
   */
  async hardDelete(
    where: WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<number> {
    return this.repository.forceDelete(where, transaction, currentUserId);
  }

  /**
   * Permanently delete entity - returns the deleted entity
   */
  async permanentlyDelete(id: string): Promise<T> {
    const entity = await this.repository.findById(id);
    await this.repository.forceDelete({ id } as any);
    return entity as T;
  }

  /**
   * Restore soft deleted entity - handles both calling patterns
   */
  async restore(
    idOrWhere: number | WhereOptions<T>,
    transaction?: Transaction,
    currentUserId?: string,
  ): Promise<T> {
    if (typeof idOrWhere === 'number') {
      // Called with just id: restore(id)
      await this.repository.restore(
        { id: idOrWhere } as any,
        transaction,
        currentUserId,
      );
      const entity = await this.repository.findById(idOrWhere, transaction);
      return entity as T;
    } else {
      // Called with where clause: restore({ id }, transaction)
      await this.repository.restore(idOrWhere, transaction, currentUserId);
      // Extract id from where clause to return the entity
      const whereClause = idOrWhere as any;
      if (whereClause.id) {
        const entity = await this.repository.findById(
          whereClause.id,
          transaction,
        );
        return entity as T;
      }
      throw new Error('Cannot restore entity without id in where clause');
    }
  }
}
