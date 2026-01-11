-- =====================================================
-- MULTI-TENANT EMAIL CAMPAIGN PLATFORM SCHEMA (MySQL)
-- Comprehensive Schema with All Improvements
-- Version: 2.0
-- =====================================================

-- Set MySQL specific settings
SET foreign_key_checks = 0;
SET sql_mode = 'TRADITIONAL';

-- =====================================================
-- CORE TENANT & USER MANAGEMENT
-- =====================================================

-- Organizations (Multi-tenant core table)
CREATE TABLE organizations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSON,
    subscription_status ENUM('trial', 'active', 'cancelled', 'expired', 'suspended') DEFAULT 'trial',
    subscription_plan_id CHAR(36),
    billing_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_organizations_slug (slug),
    INDEX idx_organizations_domain (domain),
    INDEX idx_organizations_status (subscription_status),
    INDEX idx_organizations_created (created_at)
);

-- Users table (includes organization relationship directly)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    settings JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_org (organization_id, email),
    INDEX idx_users_org (organization_id),
    INDEX idx_users_email (email),
    INDEX idx_users_status (organization_id, status),
    INDEX idx_users_role (organization_id, role),
    INDEX idx_users_last_login (last_login_at)
);

-- =====================================================
-- GMAIL OAUTH INTEGRATION & AUTHENTICATION
-- =====================================================

-- Gmail OAuth Tokens (Encrypted storage)
CREATE TABLE gmail_oauth_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    organization_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,

    -- Encrypted OAuth tokens
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,

    -- Token metadata
    token_expires_at TIMESTAMP NULL,
    scopes JSON NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Gmail API quota tracking
    daily_quota_used INT DEFAULT 0,
    quota_reset_at TIMESTAMP DEFAULT (DATE_ADD(CURDATE(), INTERVAL 1 DAY)),

    -- Compliance and consent
    consent_given_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consent_version VARCHAR(20) DEFAULT '1.0',
    data_retention_until TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 YEAR)),

    -- Status tracking
    status ENUM('active', 'expired', 'revoked', 'invalid') DEFAULT 'active',
    last_used_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_email (user_id, email),
    INDEX idx_gmail_tokens_user (user_id, organization_id),
    INDEX idx_gmail_tokens_email (email),
    INDEX idx_gmail_tokens_status (status, revoked_at),
    INDEX idx_gmail_tokens_quota (quota_reset_at, daily_quota_used)
);

-- =====================================================
-- CONTACT MANAGEMENT
-- =====================================================

-- Contacts table
CREATE TABLE contacts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    job_title VARCHAR(255),
    phone VARCHAR(50),

    -- Contact metadata
    source VARCHAR(100), -- imported, manual, api, etc.
    status ENUM('active', 'unsubscribed', 'bounced', 'complained', 'inactive') DEFAULT 'active',

    -- Email preferences
    subscribed BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    bounce_count INT DEFAULT 0,
    complaint_count INT DEFAULT 0,

    -- Custom fields (flexible JSON storage)
    custom_fields JSON,
    personal_notes TEXT, -- Encrypted personal notes

    -- Tracking
    last_email_sent_at TIMESTAMP NULL,
    last_email_opened_at TIMESTAMP NULL,
    last_email_clicked_at TIMESTAMP NULL,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_email (organization_id, email),
    INDEX idx_contacts_org_email (organization_id, email),
    INDEX idx_contacts_status (organization_id, status),
    INDEX idx_contacts_updated (organization_id, updated_at),
    INDEX idx_contacts_company (custom_fields_company),
    INDEX idx_contacts_source (organization_id, source),
    FULLTEXT KEY ft_contacts_name (first_name, last_name),
    FULLTEXT KEY ft_contacts_email (email)
);

-- Contact Lists/Segments
CREATE TABLE contact_lists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- For dynamic lists
    filter_conditions JSON,

    -- Metadata
    contact_count INT DEFAULT 0,
    created_by CHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contact_lists_org (organization_id),
    FULLTEXT KEY ft_contact_lists_name (name)
);

-- Contact List Members (Many-to-many)
CREATE TABLE contact_list_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    contact_list_id CHAR(36) NOT NULL,
    contact_id CHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by CHAR(36),

    FOREIGN KEY (contact_list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_list_contact (contact_list_id, contact_id),
    INDEX idx_contact_list_members_list (contact_list_id),
    INDEX idx_contact_list_members_contact (contact_id)
);

-- =====================================================
-- EMAIL TEMPLATES
-- =====================================================

-- Email Templates
CREATE TABLE email_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content LONGTEXT,
    text_content LONGTEXT,

    -- Template metadata
    category VARCHAR(100),
    tags JSON,
    is_shared BOOLEAN DEFAULT FALSE,

    -- Template variables/personalization
    variables JSON, -- List of template variables

    -- Design settings
    design_settings JSON,

    -- Usage tracking
    usage_count INT DEFAULT 0,
    last_used_at TIMESTAMP NULL,

    -- Versioning
    version INT DEFAULT 1,
    parent_template_id CHAR(36),

    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email_templates_org (organization_id),
    INDEX idx_email_templates_category (organization_id, category),
    INDEX idx_email_templates_usage (usage_count),
    FULLTEXT KEY ft_email_templates_name (name)
);

-- =====================================================
-- CAMPAIGNS (Enhanced with sequence functionality)
-- =====================================================

-- Email Campaigns (Enhanced with sequence settings)
CREATE TABLE campaigns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('one_time', 'sequence', 'drip', 'automated', 'recurring') DEFAULT 'one_time',

    -- Campaign settings
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    reply_to VARCHAR(255),

    -- Template reference
    template_id CHAR(36) NOT NULL,

    -- Targeting
    contact_list_id CHAR(36) NOT NULL, -- Array of contact list IDs
    segment_conditions JSON,

    -- Scheduling
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'completed') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    send_at TIMESTAMP NULL,

    -- Sequence Settings (for multi-step campaigns)
    sequence_settings JSON, -- Contains steps configuration, triggers, delays
    current_step INT DEFAULT 1,
    total_steps INT DEFAULT 1,

    -- Generated column for sequence type
    sequence_type VARCHAR(50) 
        GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(sequence_settings, '$.type'))) STORED,

    -- Campaign analytics (aggregated)
    total_recipients INT DEFAULT 0,
    emails_sent INT DEFAULT 0,
    emails_delivered INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_clicked INT DEFAULT 0,
    emails_bounced INT DEFAULT 0,
    emails_complained INT DEFAULT 0,
    unsubscribes INT DEFAULT 0,

    -- Settings
    tracking_enabled BOOLEAN DEFAULT TRUE,
    open_tracking BOOLEAN DEFAULT TRUE,
    click_tracking BOOLEAN DEFAULT TRUE,
    unsubscribe_tracking BOOLEAN DEFAULT TRUE,

    -- Sequence automation settings
    auto_advance BOOLEAN DEFAULT TRUE,
    delay_between_steps INT DEFAULT 1440, -- minutes (24 hours default)
    trigger_type ENUM('delay', 'engagement', 'event', 'condition') DEFAULT 'delay',
    trigger_conditions JSON,

    -- Compliance
    compliance_checked BOOLEAN DEFAULT FALSE,
    compliance_notes TEXT,

    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_campaigns_org (organization_id),
    INDEX idx_campaigns_status (organization_id, status),
    INDEX idx_campaigns_scheduled (status, scheduled_at),
    INDEX idx_campaigns_type (organization_id, type),
    INDEX idx_campaigns_sequence_type (sequence_type),
    INDEX idx_campaigns_created_by (created_by),
    FULLTEXT KEY ft_campaigns_name (name)
);

-- =====================================================
-- EMAIL PROCESSING & TRACKING
-- =====================================================

-- Email Messages (Individual email records)
CREATE TABLE email_messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    campaign_id CHAR(36),
    contact_id CHAR(36) NOT NULL,

    -- Campaign sequence tracking
    campaign_step CHAR(36),

    -- Gmail integration
    gmail_message_id VARCHAR(255), -- Gmail's message ID
    gmail_thread_id VARCHAR(255),  -- Gmail's thread ID
    sent_from_email VARCHAR(255) NOT NULL,

    -- Email content
    subject VARCHAR(500) NOT NULL,
    html_content LONGTEXT,
    text_content LONGTEXT,

    -- Delivery tracking
    status ENUM('queued', 'sending', 'sent', 'delivered', 'bounced', 'failed', 'cancelled') DEFAULT 'queued',
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,

    -- Engagement tracking
    opened_at TIMESTAMP NULL,
    first_opened_at TIMESTAMP NULL,
    open_count INT DEFAULT 0,
    last_opened_at TIMESTAMP NULL,

    clicked_at TIMESTAMP NULL,
    first_clicked_at TIMESTAMP NULL,
    click_count INT DEFAULT 0,
    last_clicked_at TIMESTAMP NULL,

    -- Feedback
    bounced_at TIMESTAMP NULL,
    bounce_reason TEXT,
    bounce_type ENUM('hard', 'soft', 'block', 'spam') NULL,

    complained_at TIMESTAMP NULL,
    complaint_feedback TEXT,

    unsubscribed_at TIMESTAMP NULL,

    -- Retry logic
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP NULL,

    -- Error handling
    error_message TEXT,
    error_code VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    INDEX idx_email_messages_org (organization_id),
    INDEX idx_email_messages_campaign (campaign_id),
    INDEX idx_email_messages_contact (contact_id),
    INDEX idx_email_messages_status (status, queued_at),
    INDEX idx_email_messages_sent (sent_at),
    INDEX idx_email_messages_step (campaign_id, campaign_step),
    INDEX idx_email_messages_org_status_queued (organization_id, status, queued_at)
) PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Email Tracking Events (Detailed event log)
CREATE TABLE email_tracking_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email_message_id CHAR(36) NOT NULL,
    event_type ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'spam') NOT NULL,

    -- Event details
    event_data JSON,
    user_agent TEXT,
    ip_address VARCHAR(45),
    country CHAR(2),
    city VARCHAR(100),
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown'),
    email_client VARCHAR(100),

    -- Click-specific data
    clicked_url TEXT,
    link_id VARCHAR(100),

    -- Timestamp
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Tracking pixel data
    tracking_id CHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (email_message_id) REFERENCES email_messages(id) ON DELETE CASCADE,
    INDEX idx_email_tracking_events_message (email_message_id),
    INDEX idx_email_tracking_events_type (event_type, occurred_at),
    INDEX idx_email_tracking_events_tracking (tracking_id),
    INDEX idx_email_tracking_events_org_event_time (email_message_id, event_type, occurred_at)
) PARTITION BY RANGE (YEAR(occurred_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Email Queue Jobs (BullMQ job tracking)
CREATE TABLE email_queue_jobs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    job_id VARCHAR(255) UNIQUE NOT NULL, -- BullMQ job ID
    job_type VARCHAR(100) NOT NULL,
    email_message_id CHAR(36),
    campaign_id CHAR(36),

    -- Job data
    job_data JSON NOT NULL,

    -- Job status
    status ENUM('waiting', 'active', 'completed', 'failed', 'delayed', 'paused') DEFAULT 'waiting',
    priority INT DEFAULT 0,

    -- Processing details
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,

    -- Error handling
    error_message TEXT,
    error_stack TEXT,

    -- Timing
    delay_until TIMESTAMP NULL,
    processing_time INT, -- milliseconds

    FOREIGN KEY (email_message_id) REFERENCES email_messages(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    INDEX idx_email_queue_jobs_status (status, created_at),
    INDEX idx_email_queue_jobs_job_id (job_id),
    INDEX idx_email_queue_jobs_campaign (campaign_id)
);

-- =====================================================
-- BOUNCE & SUPPRESSION MANAGEMENT
-- =====================================================

-- Email Bounce Management
CREATE TABLE bounce_management (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    bounce_type ENUM('hard', 'soft', 'block', 'spam') NOT NULL,
    bounce_reason TEXT,
    bounce_count INT DEFAULT 1,
    first_bounce_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_bounce_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_permanent BOOLEAN DEFAULT FALSE,
    auto_unsubscribe BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_email (organization_id, email),
    INDEX idx_bounce_management_type (bounce_type, is_permanent),
    INDEX idx_bounce_management_org (organization_id)
);

-- Email Suppression Lists
CREATE TABLE suppression_lists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    suppression_type ENUM('unsubscribe', 'bounce', 'complaint', 'manual') NOT NULL,
    reason TEXT,
    suppressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    suppressed_by CHAR(36),
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (suppressed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_org_email_type (organization_id, email, suppression_type),
    INDEX idx_suppression_org_type (organization_id, suppression_type)
);

-- =====================================================
-- SUBSCRIPTION & BILLING
-- =====================================================

-- Subscription Plans
CREATE TABLE subscription_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),

    -- Plan limits
    max_contacts INT,
    max_emails_per_month INT,
    max_campaigns INT,
    max_templates INT,
    max_users INT,

    -- Features
    features JSON,

    -- Plan status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_subscription_plans_active (is_active, is_public)
);

-- Organization Subscriptions
CREATE TABLE subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,

    -- Subscription details
    status ENUM('active', 'cancelled', 'past_due', 'unpaid', 'incomplete', 'trialing') DEFAULT 'active',
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',

    -- Pricing
    amount DECIMAL(10,2) NOT NULL,
    currency ENUM('USD', 'EUR', 'GBP', 'INR') DEFAULT 'USD',

    -- Billing dates
    current_period_start TIMESTAMP NULL,
    current_period_end TIMESTAMP NULL,
    trial_start TIMESTAMP NULL,
    trial_end TIMESTAMP NULL,

    -- Cancellation
    cancel_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancel_reason TEXT,

    -- External billing system integration
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    INDEX idx_subscriptions_org (organization_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_stripe (stripe_subscription_id)
);

-- Invoices
CREATE TABLE invoices (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    subscription_id CHAR(36),

    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft',

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_due DECIMAL(10,2) NOT NULL,
    currency ENUM('USD', 'EUR', 'GBP', 'INR') DEFAULT 'USD',

    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP NULL,

    -- Billing information
    billing_address JSON,

    -- External integration
    stripe_invoice_id VARCHAR(255),

    -- PDF generation
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_invoices_org (organization_id),
    INDEX idx_invoices_status (status, due_date),
    INDEX idx_invoices_number (invoice_number)
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    invoice_id CHAR(36) NOT NULL,

    description TEXT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    -- Period for subscription charges
    period_start DATE,
    period_end DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_line_items_invoice (invoice_id)
);

-- =====================================================
-- COMPLIANCE & AUDIT
-- =====================================================

-- Audit Logs (Comprehensive activity tracking)
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36),
    user_id CHAR(36),

    -- Activity details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id CHAR(36),

    -- Change tracking
    old_values JSON,
    new_values JSON,

    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Additional metadata
    metadata JSON,

    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_org (organization_id),
    INDEX idx_audit_logs_user (user_id, occurred_at),
    INDEX idx_audit_logs_resource (resource_type, resource_id),
    INDEX idx_audit_logs_action (action, occurred_at)
);

-- Consent Management
CREATE TABLE consent_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    contact_id CHAR(36) NOT NULL,
    consent_type ENUM('marketing', 'analytics', 'personalization', 'data_sharing') NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_method ENUM('explicit', 'implied', 'opt_in', 'double_opt_in') NOT NULL,
    consent_source VARCHAR(100), -- website, email, api, etc.
    consent_text TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    given_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TIMESTAMP NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    INDEX idx_consent_contact (contact_id, consent_type),
    INDEX idx_consent_org (organization_id, consent_type)
);

-- Data Processing Agreements
CREATE TABLE data_processing_agreements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    agreement_type ENUM('gdpr', 'ccpa', 'can_spam', 'casl', 'lgpd') NOT NULL,
    version VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_dpa_org_type (organization_id, agreement_type, is_active)
);

-- Data Retention Policies
CREATE TABLE data_retention_policies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,

    -- Policy details
    data_type ENUM('emails', 'contacts', 'analytics', 'logs', 'campaigns', 'templates') NOT NULL,
    retention_period_days INT NOT NULL,

    -- Policy settings
    auto_delete BOOLEAN DEFAULT FALSE,
    notify_before_deletion BOOLEAN DEFAULT TRUE,
    notification_days INT DEFAULT 7,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_data_retention_policies_org (organization_id),
    INDEX idx_data_retention_policies_type (data_type, is_active)
);

-- Compliance Records (GDPR, CAN-SPAM, etc.)
CREATE TABLE compliance_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    contact_id CHAR(36),

    -- Compliance type
    compliance_type ENUM('gdpr', 'can_spam', 'casl', 'ccpa', 'lgpd') NOT NULL,

    -- Record details
    action ENUM('consent_given', 'consent_withdrawn', 'data_exported', 'data_deleted', 'data_updated', 'opt_in', 'opt_out') NOT NULL,
    legal_basis ENUM('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'),

    -- Supporting data
    evidence JSON,
    notes TEXT,

    -- Processor information
    processed_by CHAR(36),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- External reference
    reference_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id),
    INDEX idx_compliance_records_org (organization_id),
    INDEX idx_compliance_records_contact (contact_id),
    INDEX idx_compliance_records_type (compliance_type, action)
);

-- =====================================================
-- ANALYTICS & REPORTING
-- =====================================================

-- Daily Analytics Summary (for faster reporting)
CREATE TABLE daily_analytics (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    
    -- Email metrics
    emails_sent INT DEFAULT 0,
    emails_delivered INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_clicked INT DEFAULT 0,
    emails_bounced INT DEFAULT 0,
    emails_complained INT DEFAULT 0,
    unsubscribes INT DEFAULT 0,
    
    -- Campaign metrics
    campaigns_sent INT DEFAULT 0,
    campaigns_completed INT DEFAULT 0,
    
    -- Contact metrics
    contacts_added INT DEFAULT 0,
    contacts_removed INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_date (organization_id, date),
    INDEX idx_daily_analytics_date (date)
);

-- =====================================================
-- RATE LIMITING & QUOTA MANAGEMENT
-- =====================================================

-- Rate limiting for API and email sending
CREATE TABLE rate_limits (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    resource_type ENUM('api', 'email_send', 'contact_import', 'campaign_create') NOT NULL,
    limit_type ENUM('per_minute', 'per_hour', 'per_day', 'per_month') NOT NULL,
    limit_value INT NOT NULL,
    current_usage INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP NOT NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rate_limits_org_type (organization_id, resource_type),
    INDEX idx_rate_limits_window (window_start, window_end)
);

-- =====================================================
-- WEBHOOK MANAGEMENT
-- =====================================================

-- Webhook Management
CREATE TABLE webhooks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events JSON NOT NULL, -- Array of events to listen for
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INT DEFAULT 3,
    timeout_seconds INT DEFAULT 30,
    last_triggered_at TIMESTAMP NULL,
    last_success_at TIMESTAMP NULL,
    last_failure_at TIMESTAMP NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_webhooks_org_active (organization_id, is_active)
);

-- =====================================================
-- SENSITIVE DATA ACCESS LOGGING
-- =====================================================

-- Audit trail for sensitive operations
CREATE TABLE sensitive_data_access_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id CHAR(36) NOT NULL,
    action ENUM('view', 'export', 'modify', 'delete') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sensitive_access_org (organization_id, accessed_at),
    INDEX idx_sensitive_access_user (user_id, accessed_at)
);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Campaign performance view
CREATE VIEW campaign_analytics AS
SELECT 
    c.id,
    c.organization_id,
    c.name,
    c.type,
    c.status,
    c.created_at,
    c.sent_at,
    c.total_recipients,
    c.emails_sent,
    c.emails_delivered,
    c.emails_opened,
    c.emails_clicked,
    c.emails_bounced,
    c.emails_complained,
    c.unsubscribes,

    -- Calculate rates
    CASE 
        WHEN c.emails_sent > 0 THEN 
            ROUND((c.emails_delivered / c.emails_sent * 100), 2)
        ELSE 0 
    END as delivery_rate,

    CASE 
        WHEN c.emails_delivered > 0 THEN 
            ROUND((c.emails_opened / c.emails_delivered * 100), 2)
        ELSE 0 
    END as open_rate,

    CASE 
        WHEN c.emails_delivered > 0 THEN 
            ROUND((c.emails_clicked / c.emails_delivered * 100), 2)
        ELSE 0 
    END as click_rate,

    CASE 
        WHEN c.emails_delivered > 0 THEN 
            ROUND((c.emails_bounced / c.emails_sent * 100), 2)
        ELSE 0 
    END as bounce_rate

FROM campaigns c
WHERE c.deleted_at IS NULL;

-- Organization usage summary
CREATE VIEW organization_usage AS
SELECT 
    o.id,
    o.name,
    o.subscription_status,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT cl.id) as total_lists,
    COUNT(DISTINCT et.id) as total_templates,
    COUNT(DISTINCT camp.id) as total_campaigns,
    COUNT(DISTINCT em.id) as total_emails_sent,

    -- Current month usage
    SUM(CASE 
        WHEN em.sent_at >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)
        THEN 1 ELSE 0
    END) as emails_sent_this_month,

    COUNT(CASE 
        WHEN camp.created_at >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)
        THEN camp.id 
    END) as campaigns_created_this_month

FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id AND u.status = 'active'
LEFT JOIN contacts c ON o.id = c.organization_id AND c.status = 'active'
LEFT JOIN contact_lists cl ON o.id = cl.organization_id
LEFT JOIN email_templates et ON o.id = et.organization_id AND et.deleted_at IS NULL
LEFT JOIN campaigns camp ON o.id = camp.organization_id AND camp.deleted_at IS NULL
LEFT JOIN email_messages em ON o.id = em.organization_id
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.subscription_status;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

DELIMITER $$

-- Contact list count maintenance trigger
CREATE TRIGGER contact_list_members_insert_trigger
    AFTER INSERT ON contact_list_members
    FOR EACH ROW
BEGIN
    UPDATE contact_lists 
    SET contact_count = contact_count + 1 
    WHERE id = NEW.contact_list_id;
END$$

CREATE TRIGGER contact_list_members_delete_trigger
    AFTER DELETE ON contact_list_members
    FOR EACH ROW
BEGIN
    UPDATE contact_lists 
    SET contact_count = contact_count - 1 
    WHERE id = OLD.contact_list_id;
END$$

-- Template usage count trigger
CREATE TRIGGER email_templates_usage_trigger
    AFTER INSERT ON campaigns
    FOR EACH ROW
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE email_templates 
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
END$$

-- Campaign analytics update trigger
CREATE TRIGGER email_messages_analytics_trigger
    AFTER UPDATE ON email_messages
    FOR EACH ROW
BEGIN
    IF NEW.campaign_id IS NOT NULL THEN
        -- Update sent count
        IF OLD.status != 'sent' AND NEW.status = 'sent' THEN
            UPDATE campaigns SET emails_sent = emails_sent + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update delivered count
        IF OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL THEN
            UPDATE campaigns SET emails_delivered = emails_delivered + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update opened count
        IF OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
            UPDATE campaigns SET emails_opened = emails_opened + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update clicked count
        IF OLD.clicked_at IS NULL AND NEW.clicked_at IS NOT NULL THEN
            UPDATE campaigns SET emails_clicked = emails_clicked + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update bounced count
        IF OLD.bounced_at IS NULL AND NEW.bounced_at IS NOT NULL THEN
            UPDATE campaigns SET emails_bounced = emails_bounced + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update complained count
        IF OLD.complained_at IS NULL AND NEW.complained_at IS NOT NULL THEN
            UPDATE campaigns SET emails_complained = emails_complained + 1 WHERE id = NEW.campaign_id;
        END IF;

        -- Update unsubscribe count
        IF OLD.unsubscribed_at IS NULL AND NEW.unsubscribed_at IS NOT NULL THEN
            UPDATE campaigns SET unsubscribes = unsubscribes + 1 WHERE id = NEW.campaign_id;
        END IF;
    END IF;
END$$

-- Enhanced trigger for daily analytics
CREATE TRIGGER update_daily_analytics_trigger
    AFTER INSERT ON email_messages
    FOR EACH ROW
BEGIN
    INSERT INTO daily_analytics (
        organization_id, 
        date, 
        emails_sent
    ) VALUES (
        NEW.organization_id, 
        DATE(NEW.sent_at), 
        1
    ) ON DUPLICATE KEY UPDATE 
        emails_sent = emails_sent + 1,
        updated_at = CURRENT_TIMESTAMP;
END$$

-- Trigger for automatic suppression list management
CREATE TRIGGER auto_suppress_bounced_emails
    AFTER UPDATE ON email_messages
    FOR EACH ROW
BEGIN
    IF NEW.bounced_at IS NOT NULL AND OLD.bounced_at IS NULL THEN
        INSERT IGNORE INTO suppression_lists (
            organization_id,
            email,
            suppression_type,
            reason
        ) VALUES (
            NEW.organization_id,
            (SELECT email FROM contacts WHERE id = NEW.contact_id),
            'bounce',
            NEW.bounce_reason
        );
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- SET FOREIGN KEY CHECKS BACK
-- =====================================================

SET foreign_key_checks = 1;

-- =====================================================
-- SCHEMA DOCUMENTATION COMPLETE - MYSQL VERSION 2.0
-- =====================================================
