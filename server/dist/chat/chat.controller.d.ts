import { ChatService } from './chat.service';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    getHealth(): {
        status: string;
        timestamp: string;
    };
    getStats(): Promise<{
        totalRooms: number;
        totalMessages: number;
        totalVolunteers: number;
        activeRooms: number;
        queueLength: number;
    }>;
    getQueue(): {
        roomId: string;
        mood: string;
        nickname: string;
        waitingMinutes: number;
    }[];
    getMessages(roomId: string): Promise<{
        id: string;
        senderType: string;
        content: string;
        createdAt: Date;
    }[]>;
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
}
