import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

export enum UserType {
  USER = 'USER',
  EMPLOYEE = 'EMPLOYEE',
}

@Table({
  tableName: 'password_reset_tokens',
  timestamps: true,
  underscored: true,
  paranoid: false, // No soft deletes for tokens
})
export class PasswordResetToken extends Model {
  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'Email address requesting password reset',
  })
  email: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserType)),
    allowNull: false,
    comment: 'Type of user requesting reset',
  })
  userType: UserType;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Unique verification token',
  })
  token: string;

  @Column({
    type: DataType.STRING(6),
    allowNull: true,
    comment: '6-digit OTP for verification',
  })
  otp: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'Token expiration timestamp',
  })
  expiresAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether token has been used',
  })
  used: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of verification attempts',
  })
  attempts: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  updatedAt: Date;

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token is valid (not expired, not used, within attempt limit)
   */
  isValid(maxAttempts: number = 5): boolean {
    return !this.isExpired() && !this.used && this.attempts < maxAttempts;
  }
}

