import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Organization } from 'src/resources/organizations/entities/organization.entity';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');

    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay keys not configured. Payment features will not work.');
    } else {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  /**
   * Create a Razorpay customer for an organization
   */
  async createCustomer(organization: Organization): Promise<any> {
    try {
      // Check if Razorpay is initialized
      if (!this.razorpay) {
        const errorMsg = 'Razorpay is not initialized. Please check RAZOR_PAY_KEY and RAZOR_PAY_SECRET environment variables.';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      try {
        const customer = await this.razorpay.customers.create({
          name: organization.name,
          email: organization.billingEmail || organization.domain,
          contact: organization.phone || undefined,
          notes: {
            organizationId: organization.id,
            domain: organization.domain,
          },
        });

        this.logger.log(`Created Razorpay customer ${customer.id} for organization ${organization.id}`);
        return customer;
      } catch (createError: any) {
        // Check if customer already exists error - check multiple possible error formats
        const errorMessage = createError?.error?.description || createError?.error?.message || createError?.message || '';
        const errorCode = createError?.error?.code || '';
        const isCustomerExistsError = 
          errorCode === 'BAD_REQUEST_ERROR' ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('customer already exists') ||
          errorMessage.toLowerCase().includes('already exists for the merchant');
        
        if (isCustomerExistsError) {
          // Try to find existing customer by fetching all customers and searching
          this.logger.warn(`Customer already exists for organization ${organization.id}, attempting to find existing customer`);
          
          try {
            const searchEmail = organization.billingEmail || organization.domain;
            
            // Fetch customers and search for matching one
            const customersResponse = await this.razorpay.customers.all({
              count: 100, // Get more results to search through
            });
            
            if (customersResponse && (customersResponse as any).items) {
              const customers = (customersResponse as any).items;
              
              // Search by email or organization ID in notes
              const matchingCustomer = customers.find(
                (c: any) => {
                  if (searchEmail && c.email === searchEmail) {
                    return true;
                  }
                  if (c.notes && c.notes.organizationId === organization.id) {
                    return true;
                  }
                  return false;
                }
              );
              
              if (matchingCustomer) {
                this.logger.log(`Found existing Razorpay customer ${matchingCustomer.id} for organization ${organization.id}`);
                return matchingCustomer;
              }
            }
          } catch (findError) {
            this.logger.error(`Failed to find existing customer:`, findError);
          }
          
          // If we can't find it, log a warning but don't fail - let the subscription proceed
          // The customer ID might be stored in the subscription already
          this.logger.warn(
            `Could not find existing Razorpay customer for organization ${organization.id}, ` +
            `but customer exists. Payment may still proceed if customer ID is stored.`
          );
          
          // Return null to indicate customer exists but couldn't be retrieved
          // The payment flow should continue without customer ID
          return null;
        }
        throw createError;
      }
    } catch (error) {
      // Extract actual error message
      let errorMessage = 'Failed to create Razorpay customer';
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException as-is
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        const razorpayError = (error as any).error;
        if (razorpayError && razorpayError.description) {
          errorMessage = razorpayError.description;
        } else if (razorpayError && razorpayError.message) {
          errorMessage = razorpayError.message;
        }
      }

      this.logger.error(`Failed to create Razorpay customer for organization ${organization.id}:`, {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Create a Razorpay order with plan details
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<any> {
    try {
      // Check if Razorpay is initialized
      if (!this.razorpay) {
        const errorMsg = 'Razorpay is not initialized. Please check RAZOR_PAY_KEY and RAZOR_PAY_SECRET environment variables.';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      // Validate amount
      if (!createOrderDto.amount || createOrderDto.amount <= 0) {
        const errorMsg = `Invalid amount: ${createOrderDto.amount}. Amount must be greater than 0.`;
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      // Validate currency
      if (!createOrderDto.currency) {
        const errorMsg = 'Currency is required';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      const amountInPaise = Math.round(createOrderDto.amount * 100);
      
      // Razorpay minimum amount is 1 cent (0.01 USD)
      if (amountInPaise < 1) {
        const errorMsg = `Amount too small: ${createOrderDto.amount}. Minimum amount is 0.01 ${createOrderDto.currency}`;
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      // Ensure receipt is max 40 characters (Razorpay requirement)
      let receipt = createOrderDto.receipt || `rcpt-${Date.now()}`;
      if (receipt.length > 40) {
        // Truncate to 40 characters if too long
        receipt = receipt.substring(0, 40);
        this.logger.warn(`Receipt ID truncated to 40 characters: ${receipt}`);
      }

      const orderData: any = {
        amount: amountInPaise,
        currency: createOrderDto.currency,
        receipt: receipt,
        notes: {
          ...createOrderDto.notes,
          planName: createOrderDto.planName,
          planDescription: createOrderDto.planDescription,
          billingCycle: createOrderDto.billingCycle,
        },
      };

      this.logger.log(`Creating Razorpay order with amount: ${amountInPaise} paise (${createOrderDto.amount} ${createOrderDto.currency})`);

      const order = await this.razorpay.orders.create(orderData);

      this.logger.log(`Created Razorpay order ${order.id} for amount ${createOrderDto.amount} ${createOrderDto.currency}`);
      return order;
    } catch (error) {
      // Extract actual error message from Razorpay
      let errorMessage = 'Failed to create Razorpay order';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        const razorpayError = (error as any).error;
        if (razorpayError && razorpayError.description) {
          errorMessage = razorpayError.description;
        } else if (razorpayError && razorpayError.message) {
          errorMessage = razorpayError.message;
        }
      }

      this.logger.error('Failed to create Razorpay order:', {
        error: errorMessage,
        details: error,
        orderData: {
          amount: createOrderDto.amount,
          currency: createOrderDto.currency,
          receipt: createOrderDto.receipt,
        },
      });

      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Verify payment signature
   * Note: Payment signatures use keySecret, not webhookSecret
   */
  verifyPaymentSignature(verifyPaymentDto: VerifyPaymentDto): boolean {
    try {
      // For payment signature verification, use keySecret (not webhookSecret)
      const keySecret = this.configService.get<string>('razorpay.keySecret');
      if (!keySecret) {
        this.logger.error('Razorpay keySecret not configured. Cannot verify payment signature.');
        return false;
      }

      const text = `${verifyPaymentDto.orderId}|${verifyPaymentDto.paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      const isValid = generatedSignature === verifyPaymentDto.signature;

      if (!isValid) {
        this.logger.warn(`Invalid payment signature for order ${verifyPaymentDto.orderId}`, {
          orderId: verifyPaymentDto.orderId,
          paymentId: verifyPaymentDto.paymentId,
          text: text,
          expectedSignature: generatedSignature.substring(0, 20) + '...',
          receivedSignature: verifyPaymentDto.signature.substring(0, 20) + '...',
          keySecretConfigured: !!keySecret,
        });
      } else {
        this.logger.log(`Payment signature verified successfully for order ${verifyPaymentDto.orderId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Get payment details from Razorpay
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      // Check if Razorpay is initialized
      if (!this.razorpay) {
        const errorMsg = 'Razorpay is not initialized. Please check RAZOR_PAY_KEY and RAZOR_PAY_SECRET environment variables.';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      // Extract actual error message
      let errorMessage = 'Failed to fetch payment details';
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException as-is
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        const razorpayError = (error as any).error;
        if (razorpayError && razorpayError.description) {
          errorMessage = razorpayError.description;
        } else if (razorpayError && razorpayError.message) {
          errorMessage = razorpayError.message;
        }
      }

      this.logger.error(`Failed to fetch payment details for ${paymentId}:`, {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Get order details from Razorpay
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      // Check if Razorpay is initialized
      if (!this.razorpay) {
        const errorMsg = 'Razorpay is not initialized. Please check RAZOR_PAY_KEY and RAZOR_PAY_SECRET environment variables.';
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      // Extract actual error message
      let errorMessage = 'Failed to fetch order details';
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException as-is
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'error' in error) {
        const razorpayError = (error as any).error;
        if (razorpayError && razorpayError.description) {
          errorMessage = razorpayError.description;
        } else if (razorpayError && razorpayError.message) {
          errorMessage = razorpayError.message;
        }
      }

      this.logger.error(`Failed to fetch order details for ${orderId}:`, {
        error: errorMessage,
        details: error,
      });
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

