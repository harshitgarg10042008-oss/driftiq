import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // We map socket.id to user_id (if authenticated)
  private userSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
      client.join(`user_${userId}`);
      console.log(`User ${userId} connected to WS`);
    }
  }

  handleDisconnect(client: Socket) {
    // Remove disconnected socket from userSockets map to prevent memory leaks
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`User ${userId} disconnected from WS`);
        break;
      }
    }
  }

  // Called by the Telegram Service when a new file arrives via webhook
  notifyFileAdded(userId: string, fileData: any) {
    this.server.to(`user_${userId}`).emit('file_added', fileData);
  }
}
