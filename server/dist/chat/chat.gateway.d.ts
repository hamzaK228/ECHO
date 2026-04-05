import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private chatService;
    server: Server;
    private socketRoomMap;
    private volunteerSockets;
    constructor(chatService: ChatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleChatRequest(client: Socket, data: {
        nickname: string;
        mood: string;
        topic: string;
        sessionId: string;
    }): Promise<{
        roomId: string;
    }>;
    handleVolunteerJoin(client: Socket, data: {
        volunteerId: string;
    }): Promise<{
        status: string;
    }>;
    handleChatAccept(client: Socket, data: {
        roomId: string;
        volunteerId: string;
    }): Promise<{
        status: string;
        roomId: string;
    }>;
    handleMessage(client: Socket, data: {
        roomId: string;
        content: string;
        senderType: 'anon' | 'volunteer';
    }): Promise<{
        status: string;
        messageId: string;
    }>;
    handleTypingStart(client: Socket, data: {
        roomId: string;
        senderType: string;
    }): void;
    handleTypingStop(client: Socket, data: {
        roomId: string;
        senderType: string;
    }): void;
    handleTelegramChatAccepted(payload: {
        roomId: string;
        volunteerName: string;
    }): void;
    handleTelegramMessage(payload: {
        roomId: string;
        content: string;
        senderType: string;
    }): Promise<void>;
    handleTelegramChatClosed(payload: {
        roomId: string;
    }): void;
    handleChatClose(client: Socket, data: {
        roomId: string;
    }): Promise<{
        status: string;
    }>;
}
