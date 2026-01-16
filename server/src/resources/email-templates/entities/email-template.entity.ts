import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { EmailTemplateType } from '../enums/email-template-type.enum';
import { EmailSendFormat } from '../enums/email-send-format.enum';

@Table({
  tableName: 'email_templates',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    // Unique constraint for name within organization (handles soft deletes)
    {
      unique: true,
      name: 'idx_email_templates_org_name',
      fields: ['organization_id', 'name', 'deleted_at'],
    },
    // Composite index for access filter queries
    {
      name: 'idx_email_templates_access',
      fields: ['organization_id', 'type', 'created_by', 'deleted_at'],
    },
    // Index for category filtering
    {
      name: 'idx_email_templates_category',
      fields: ['organization_id', 'category', 'deleted_at'],
    },
  ],
})
export class EmailTemplate extends BaseEntity {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  organizationId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
  })
  htmlContent: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
  })
  textContent: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    field: 'plain_text',
  })
  plainText: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  category: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  tags: string[];

  @Column({
    type: DataType.ENUM(...Object.values(EmailTemplateType)),
    allowNull: false,
    defaultValue: EmailTemplateType.PRIVATE,
  })
  type: EmailTemplateType;

  @Column({
    type: DataType.ENUM(...Object.values(EmailSendFormat)),
    allowNull: false,
    defaultValue: EmailSendFormat.TEXT,
  })
  sendFormat: EmailSendFormat;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  variables: string[];

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  designSettings: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  usageCount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastUsedAt: Date;


  @BelongsTo(() => Organization)
  organization: Organization;

  @BelongsTo(() => User, 'createdBy')
  createdByUser: User;
}
