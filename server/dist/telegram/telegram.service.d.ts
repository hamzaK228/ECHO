import { OnModuleInit } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { ChatService } from '../chat/chat.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class TelegramService implements OnModuleInit {
    private bot;
    private prisma;
    private encryption;
    private chatService;
    private eventEmitter;
    private botId;
    constructor(bot: Telegraf<Context>, prisma: PrismaService, encryption: EncryptionService, chatService: ChatService, eventEmitter: EventEmitter2);
    onModuleInit(): Promise<void>;
    onStart(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage | undefined>;
    handleRoomCreated(room: any): Promise<void>;
    onAcceptChat(ctx: Context): Promise<true | (import("@telegraf/types").Update.Edited & import("@telegraf/types").Message.TextMessage) | undefined>;
    handleMessageFromAnon(payload: any): Promise<void>;
    onMessage(text: string, ctx: Context): Promise<import("@telegraf/types").Message.TextMessage | undefined>;
}
