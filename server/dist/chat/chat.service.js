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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../common/encryption.service");
const event_emitter_1 = require("@nestjs/event-emitter");
let ChatService = class ChatService {
    prisma;
    encryption;
    eventEmitter;
    waitingQueue = new Map();
    constructor(prisma, encryption, eventEmitter) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.eventEmitter = eventEmitter;
    }
    async createRoom(nickname, mood, topic, sessionId) {
        const roomKey = this.encryption.generateRoomKey();
        const room = await this.prisma.chatRoom.create({
            data: {
                anonNickname: nickname,
                anonSessionId: sessionId,
                mood,
                topic,
                encryptionKey: roomKey,
                status: 'waiting',
            },
        });
        this.eventEmitter.emit('room.created', room);
        return room;
    }
    addToQueue(roomId, socketId, mood, nickname) {
        this.waitingQueue.set(roomId, {
            roomId,
            socketId,
            mood,
            nickname,
            joinedAt: new Date(),
        });
    }
    removeFromQueue(roomId) {
        this.waitingQueue.delete(roomId);
    }
    getQueue() {
        return Array.from(this.waitingQueue.values()).map((item) => ({
            roomId: item.roomId,
            mood: item.mood,
            nickname: item.nickname,
            waitingMinutes: Math.round((Date.now() - item.joinedAt.getTime()) / 60000),
        }));
    }
    async acceptChat(roomId, volunteerId) {
        const room = await this.prisma.chatRoom.update({
            where: { id: roomId },
            data: {
                volunteerId,
                status: 'active',
            },
            include: { volunteer: true },
        });
        this.removeFromQueue(roomId);
        this.eventEmitter.emit('chat.accepted', room);
        return room;
    }
    async saveMessage(roomId, plaintext, senderType) {
        const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room)
            throw new Error('Room not found');
        const { encrypted, iv, authTag } = this.encryption.encrypt(plaintext, room.encryptionKey);
        const message = await this.prisma.message.create({
            data: {
                content: encrypted,
                iv,
                authTag,
                senderType,
                chatRoomId: roomId,
            },
        });
        const result = {
            id: message.id,
            senderType: message.senderType,
            content: plaintext,
            createdAt: message.createdAt,
            chatRoomId: roomId,
        };
        if (senderType === 'anon') {
            this.eventEmitter.emit('message.from_anon', result);
        }
        return result;
    }
    async getMessages(roomId) {
        const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room)
            return [];
        const messages = await this.prisma.message.findMany({
            where: { chatRoomId: roomId },
            orderBy: { createdAt: 'asc' },
        });
        return messages.map((msg) => ({
            id: msg.id,
            senderType: msg.senderType,
            content: this.encryption.decrypt(msg.content, msg.iv, msg.authTag, room.encryptionKey),
            createdAt: msg.createdAt,
        }));
    }
    async closeRoom(roomId) {
        return this.prisma.chatRoom.update({
            where: { id: roomId },
            data: {
                status: 'closed',
                closedAt: new Date(),
            },
        });
    }
    async getVolunteerRooms(volunteerId) {
        return this.prisma.chatRoom.findMany({
            where: {
                volunteerId,
                status: 'active',
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    findQueueBySocketId(socketId) {
        for (const [roomId, entry] of this.waitingQueue.entries()) {
            if (entry.socketId === socketId)
                return roomId;
        }
        return null;
    }
    async getStats() {
        const totalRooms = await this.prisma.chatRoom.count();
        const totalMessages = await this.prisma.message.count();
        const totalVolunteers = await this.prisma.volunteer.count();
        const activeRooms = await this.prisma.chatRoom.count({
            where: { status: 'active' },
        });
        const queueLength = this.waitingQueue.size;
        return {
            totalRooms,
            totalMessages,
            totalVolunteers,
            activeRooms,
            queueLength,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        event_emitter_1.EventEmitter2])
], ChatService);
//# sourceMappingURL=chat.service.js.map