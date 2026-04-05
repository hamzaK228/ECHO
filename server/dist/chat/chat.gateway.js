"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const chat_service_1 = require("./chat.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let ChatGateway = class ChatGateway {
    chatService;
    server;
    socketRoomMap = new Map();
    volunteerSockets = new Map();
    constructor(chatService) {
        this.chatService = chatService;
    }
    handleConnection(client) {
        console.log(`🔌 Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`❌ Client disconnected: ${client.id}`);
        const roomId = this.chatService.findQueueBySocketId(client.id);
        if (roomId) {
            this.chatService.removeFromQueue(roomId);
            this.server.to('volunteers').emit('queue:updated', this.chatService.getQueue());
        }
        const mappedRoom = this.socketRoomMap.get(client.id);
        if (mappedRoom) {
            this.server.to(mappedRoom).emit('partner:disconnected');
            this.socketRoomMap.delete(client.id);
        }
        this.volunteerSockets.delete(client.id);
    }
    async handleChatRequest(client, data) {
        const room = await this.chatService.createRoom(data.nickname, data.mood, data.topic || 'general', data.sessionId);
        this.chatService.addToQueue(room.id, client.id, data.mood, data.nickname);
        client.join(room.id);
        this.socketRoomMap.set(client.id, room.id);
        client.emit('chat:waiting', { roomId: room.id });
        this.server.to('volunteers').emit('queue:updated', this.chatService.getQueue());
        return { roomId: room.id };
    }
    async handleVolunteerJoin(client, data) {
        client.join('volunteers');
        this.volunteerSockets.set(client.id, data.volunteerId);
        client.emit('queue:updated', this.chatService.getQueue());
        return { status: 'joined' };
    }
    async handleChatAccept(client, data) {
        const room = await this.chatService.acceptChat(data.roomId, data.volunteerId);
        client.join(data.roomId);
        this.socketRoomMap.set(client.id, data.roomId);
        this.server.to(data.roomId).emit('chat:started', {
            roomId: data.roomId,
            volunteerName: room.volunteer?.displayName || 'Волонтёр',
        });
        this.server.to('volunteers').emit('queue:updated', this.chatService.getQueue());
        return { status: 'accepted', roomId: data.roomId };
    }
    async handleMessage(client, data) {
        const message = await this.chatService.saveMessage(data.roomId, data.content, data.senderType);
        this.server.to(data.roomId).emit('message:new', message);
        return { status: 'sent', messageId: message.id };
    }
    handleTypingStart(client, data) {
        client.to(data.roomId).emit('typing:show', { senderType: data.senderType });
    }
    handleTypingStop(client, data) {
        client.to(data.roomId).emit('typing:hide', { senderType: data.senderType });
    }
    handleTelegramChatAccepted(payload) {
        this.server.to(payload.roomId).emit('chat:started', {
            roomId: payload.roomId,
            volunteerName: payload.volunteerName,
        });
        this.server.to('volunteers').emit('queue:updated', this.chatService.getQueue());
    }
    async handleTelegramMessage(payload) {
        this.server.to(payload.roomId).emit('message:new', {
            id: Math.random().toString(36).substr(2, 9),
            senderType: payload.senderType,
            content: payload.content,
            createdAt: new Date(),
        });
    }
    handleTelegramChatClosed(payload) {
        this.server.to(payload.roomId).emit('chat:ended', { roomId: payload.roomId });
        this.server.to('volunteers').emit('queue:updated', this.chatService.getQueue());
    }
    async handleChatClose(client, data) {
        await this.chatService.closeRoom(data.roomId);
        this.server.to(data.roomId).emit('chat:ended', { roomId: data.roomId });
        return { status: 'closed' };
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:request'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleChatRequest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('volunteer:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleVolunteerJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:accept'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleChatAccept", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, event_emitter_1.OnEvent)('telegram.chat_accepted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTelegramChatAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('telegram.message'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTelegramMessage", null);
__decorate([
    (0, event_emitter_1.OnEvent)('telegram.chat_closed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTelegramChatClosed", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:close'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleChatClose", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map