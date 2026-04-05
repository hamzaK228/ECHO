import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ChatService {
    private prisma;
    private encryption;
    private eventEmitter;
    private waitingQueue;
    constructor(prisma: PrismaService, encryption: EncryptionService, eventEmitter: EventEmitter2);
    createRoom(nickname: string, mood: string, topic: string, sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        anonNickname: string;
        anonSessionId: string;
        mood: string;
        topic: string;
        status: string;
        encryptionKey: string;
        closedAt: Date | null;
        volunteerId: string | null;
    }>;
    addToQueue(roomId: string, socketId: string, mood: string, nickname: string): void;
    removeFromQueue(roomId: string): void;
    getQueue(): {
        roomId: string;
        mood: string;
        nickname: string;
        waitingMinutes: number;
    }[];
    acceptChat(roomId: string, volunteerId: string): Promise<{
        volunteer: {
            username: string;
            displayName: string;
            id: string;
            telegramId: bigint | null;
            passwordHash: string;
            isOnline: boolean;
            isVerified: boolean;
            level: number;
            rating: number;
            hoursCount: number;
            totalChats: number;
            bio: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        anonNickname: string;
        anonSessionId: string;
        mood: string;
        topic: string;
        status: string;
        encryptionKey: string;
        closedAt: Date | null;
        volunteerId: string | null;
    }>;
    saveMessage(roomId: string, plaintext: string, senderType: 'anon' | 'volunteer'): Promise<{
        id: string;
        senderType: string;
        content: string;
        createdAt: Date;
        chatRoomId: string;
    }>;
    getMessages(roomId: string): Promise<{
        id: string;
        senderType: string;
        content: string;
        createdAt: Date;
    }[]>;
    closeRoom(roomId: string): Promise<{
        id: string;
        createdAt: Date;
        anonNickname: string;
        anonSessionId: string;
        mood: string;
        topic: string;
        status: string;
        encryptionKey: string;
        closedAt: Date | null;
        volunteerId: string | null;
    }>;
    getVolunteerRooms(volunteerId: string): Promise<{
        id: string;
        createdAt: Date;
        anonNickname: string;
        anonSessionId: string;
        mood: string;
        topic: string;
        status: string;
        encryptionKey: string;
        closedAt: Date | null;
        volunteerId: string | null;
    }[]>;
    findQueueBySocketId(socketId: string): string | null;
    getStats(): Promise<{
        totalRooms: number;
        totalMessages: number;
        totalVolunteers: number;
        activeRooms: number;
        queueLength: number;
    }>;
}
