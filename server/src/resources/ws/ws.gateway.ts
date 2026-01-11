import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { WsService } from './ws.service';
import { CreateWDto } from './dto/create-w.dto';
import { Socket } from 'socket.io';
import { UpdateWDto } from './dto/update-w.dto';
import { Server } from 'socket.io';
import { RedisProgressService } from 'src/common/services/redis-progress.service';

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4200',
      'http://localhost:5173', // Vite dev server
      'http://localhost:5174', // Alternative Vite port
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    private readonly wsService: WsService,
    private readonly redisProgressService: RedisProgressService,
  ) {}

  @WebSocketServer()
  server: Server; // Access to the underlying socket.io server

  afterInit() {
    // Subscribe to Redis progress updates and forward to WebSocket clients
    this.redisProgressService.subscribeToProgress((fileId, progress) => {
      console.log(
        `📡 Received progress from Redis for ${fileId}, forwarding to WebSocket clients`,
      );
      this.server
        ?.to(`upload-${fileId}`)
        .emit(`upload-progress-${fileId}`, progress);
      this.server?.emit(`upload-progress-${fileId}`, progress);
    });
  }

  handleConnection(client: Socket) {
    console.log(
      `🔌 Client connected: ${client.id} from ${client.handshake.address}`,
    );
    console.log(`🌐 Client origin: ${client.handshake.headers.origin}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message1')
  handleMessage(@MessageBody() message: string): void {
    console.log('Received message:', message);
    this.server.emit('message', `Server received: ${message}`); // Broadcast to all clients
  }

  @SubscribeMessage('test-connection')
  handleTestConnection(client: Socket): void {
    console.log('🧪 Test connection received from:', client.id);
    client.emit('test-response', {
      message: 'WebSocket connection is working!',
      timestamp: new Date().toISOString(),
      clientId: client.id,
    });
  }

  // Method to emit upload progress updates
  async emitUploadProgress(fileId: string, progress: any) {
    console.log(`📊 Emitting progress for fileId: ${fileId}`, progress);

    // If running in worker process (no HTTP server), publish to Redis
    if (!this.server) {
      console.log('📤 Publishing progress to Redis (worker process)');
      await this.redisProgressService.publishProgress(fileId, progress);
      return;
    }

    // If running in API server, emit directly to WebSocket clients
    this.server
      .to(`upload-${fileId}`)
      .emit(`upload-progress-${fileId}`, progress);
    // Also emit globally as fallback
    this.server.emit(`upload-progress-${fileId}`, progress);
  }

  // Method to join a specific upload room for targeted updates
  @SubscribeMessage('join-upload-room')
  handleJoinUploadRoom(client: Socket, fileId: string): void {
    client.join(`upload-${fileId}`);
    console.log(`Client ${client.id} joined upload room: upload-${fileId}`);
  }

  // Method to leave upload room
  @SubscribeMessage('leave-upload-room')
  handleLeaveUploadRoom(client: Socket, fileId: string): void {
    client.leave(`upload-${fileId}`);
    console.log(`Client ${client.id} left upload room: upload-${fileId}`);
  }

  // ===== Campaign Progress Methods =====

  /**
   * Emit campaign-level progress updates
   */
  async emitCampaignProgress(campaignId: string, progress: any) {
    console.log(`📧 Emitting campaign progress for campaignId: ${campaignId}`);

    // If running in worker process (no HTTP server), publish to Redis
    if (!this.server) {
      console.log('📤 Publishing campaign progress to Redis (worker process)');
      await this.redisProgressService.publishProgress(
        `campaign-${campaignId}`,
        progress,
      );
      return;
    }

    // If running in API server, emit directly to WebSocket clients
    this.server
      .to(`campaign-${campaignId}`)
      .emit(`campaign-progress-${campaignId}`, progress);
    // Also emit globally as fallback
    this.server.emit(`campaign-progress-${campaignId}`, progress);
  }

  /**
   * Emit step-level progress updates
   */
  async emitStepProgress(stepId: string, progress: any) {
    console.log(`📧 Emitting step progress for stepId: ${stepId}`);

    // If running in worker process (no HTTP server), publish to Redis
    if (!this.server) {
      console.log('📤 Publishing step progress to Redis (worker process)');
      await this.redisProgressService.publishProgress(`step-${stepId}`, progress);
      return;
    }

    // If running in API server, emit directly to WebSocket clients
    this.server.to(`step-${stepId}`).emit(`step-progress-${stepId}`, progress);
    // Also emit globally as fallback
    this.server.emit(`step-progress-${stepId}`, progress);
  }

  /**
   * Join campaign room for targeted updates
   */
  @SubscribeMessage('join-campaign-room')
  handleJoinCampaignRoom(client: Socket, campaignId: string): void {
    client.join(`campaign-${campaignId}`);
    console.log(`Client ${client.id} joined campaign room: campaign-${campaignId}`);
  }

  /**
   * Leave campaign room
   */
  @SubscribeMessage('leave-campaign-room')
  handleLeaveCampaignRoom(client: Socket, campaignId: string): void {
    client.leave(`campaign-${campaignId}`);
    console.log(`Client ${client.id} left campaign room: campaign-${campaignId}`);
  }

  // ===== Notification Methods =====

  /**
   * Emit notification to user-specific room
   */
  async emitNotification(userId: string, notification: any): Promise<void> {
    console.log(`📬 Emitting notification to user ${userId}:`, notification);

    // If running in worker process (no HTTP server), publish to Redis
    if (!this.server) {
      console.log('📤 Publishing notification to Redis (worker process)');
      await this.redisProgressService.publishProgress(
        `notification-${userId}`,
        notification,
      );
      return;
    }

    // If running in API server, emit directly to WebSocket clients
    this.server
      .to(`user-${userId}`)
      .emit(`notification-${userId}`, notification);
    // Also emit globally as fallback
    this.server.emit(`notification-${userId}`, notification);
  }

  /**
   * Join user-specific notification room
   */
  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(client: Socket, userId: string): void {
    client.join(`user-${userId}`);
    console.log(`Client ${client.id} joined user room: user-${userId}`);
  }

  /**
   * Leave user-specific notification room
   */
  @SubscribeMessage('leave-user-room')
  handleLeaveUserRoom(client: Socket, userId: string): void {
    client.leave(`user-${userId}`);
    console.log(`Client ${client.id} left user room: user-${userId}`);
  }
}
