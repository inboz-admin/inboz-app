import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { PasswordResetToken, UserType } from './entities/password-reset-token.entity';
import { Op } from 'sequelize';

@Injectable()
export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  constructor(
    @InjectModel(PasswordResetToken)
    tokenModel: typeof PasswordResetToken,
  ) {
    super(tokenModel);
  }

  // Password reset tokens don't need tenant filtering
  protected supportsTenantFiltering(): boolean {
    return false;
  }

  /**
   * Invalidate all existing tokens for a user
   * Marks them as used or deletes expired ones
   */
  async invalidateTokens(
    email: string,
    userType: UserType,
    transaction?: any,
  ): Promise<number> {
    const now = new Date();
    
    // Delete expired tokens
    await this.model.destroy({
      where: {
        email,
        userType,
        expiresAt: {
          [Op.lt]: now,
        },
      },
      transaction,
    });

    // Mark non-expired tokens as used
    const [affectedCount] = await this.model.update(
      { used: true },
      {
        where: {
          email,
          userType,
          expiresAt: {
            [Op.gte]: now,
          },
          used: false,
        },
        transaction,
      },
    );

    return affectedCount;
  }

  /**
   * Create a new password reset token
   */
  async createToken(
    email: string,
    userType: UserType,
    token: string,
    otp: string,
    expiresAt: Date,
    transaction?: any,
  ): Promise<PasswordResetToken> {
    return this.model.create(
      {
        email,
        userType,
        token,
        otp,
        expiresAt,
        used: false,
        attempts: 0,
      },
      { transaction },
    );
  }

  /**
   * Find a valid token by email, userType, and OTP
   */
  async findValidToken(
    email: string,
    userType: UserType,
    otp: string,
    transaction?: any,
  ): Promise<PasswordResetToken | null> {
    const token = await this.model.findOne({
      where: {
        email,
        userType,
        otp,
        used: false,
        expiresAt: {
          [Op.gte]: new Date(),
        },
        attempts: {
          [Op.lt]: 5, // Max 5 attempts
        },
      },
      transaction,
      order: [['createdAt', 'DESC']], // Get most recent token
    });

    return token as PasswordResetToken | null;
  }

  /**
   * Find a valid token by email and userType (for reset password step)
   */
  async findValidTokenByEmail(
    email: string,
    userType: UserType,
    transaction?: any,
  ): Promise<PasswordResetToken | null> {
    const token = await this.model.findOne({
      where: {
        email,
        userType,
        used: false,
        expiresAt: {
          [Op.gte]: new Date(),
        },
        attempts: {
          [Op.lt]: 5,
        },
      },
      transaction,
      order: [['createdAt', 'DESC']],
    });

    return token as PasswordResetToken | null;
  }

  /**
   * Increment attempt count for a token
   */
  async incrementAttempts(
    tokenId: string,
    transaction?: any,
  ): Promise<void> {
    await this.model.increment('attempts', {
      where: { id: tokenId },
      transaction,
    });
  }

  /**
   * Mark token as used
   */
  async markAsUsed(
    tokenId: string,
    transaction?: any,
  ): Promise<void> {
    await this.model.update(
      { used: true },
      {
        where: { id: tokenId },
        transaction,
      },
    );
  }
}

