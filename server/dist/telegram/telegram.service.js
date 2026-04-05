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
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_telegraf_1 = require("nestjs-telegraf");
const telegraf_1 = require("telegraf");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const encryption_service_1 = require("../common/encryption.service");
const chat_service_1 = require("../chat/chat.service");
const event_emitter_2 = require("@nestjs/event-emitter");
let TelegramService = class TelegramService {
    bot;
    prisma;
    encryption;
    chatService;
    eventEmitter;
    botId;
    constructor(bot, prisma, encryption, chatService, eventEmitter) {
        this.bot = bot;
        this.prisma = prisma;
        this.encryption = encryption;
        this.chatService = chatService;
        this.eventEmitter = eventEmitter;
    }
    async onModuleInit() {
        const me = await this.bot.telegram.getMe();
        this.botId = me.id;
        console.log(`🤖 Telegram Bot [${me.username}] initialized.`);
    }
    async onStart(ctx) {
        const tgUser = ctx.from;
        if (!tgUser)
            return;
        let volunteer = await this.prisma.volunteer.findFirst({
            where: { telegramId: BigInt(tgUser.id) },
        });
        if (!volunteer) {
            return ctx.reply(`👋 Привет! Я — ECHO Bot для волонтёров.\n\nТвой Telegram ID: ${tgUser.id}\nПожалуйста, свяжись с администратором, чтобы привязать этот ID к твоему аккаунту ECHO.`);
        }
        return ctx.reply(`👋 С возвращением, ${volunteer.displayName}!\n\nСейчас я буду присылать сюда новые запросы на чат от подростков. Как только появится запрос, нажми "Принять", чтобы начать разговор.`);
    }
    async handleRoomCreated(room) {
        const volunteers = await this.prisma.volunteer.findMany({
            where: {
                telegramId: { not: null },
                isVerified: true
            },
        });
        const message = `🔔 **Новый запрос на чат!**\n\n` +
            `👤 Ник: ${room.anonNickname}\n` +
            `🎭 Настроение: ${room.mood}\n` +
            `💬 Тема: ${room.topic}\n\n` +
            `Нажми кнопку ниже, чтобы принять этот вызов.`;
        for (const v of volunteers) {
            try {
                await this.bot.telegram.sendMessage(Number(v.telegramId), message, {
                    parse_mode: 'Markdown',
                    ...telegraf_1.Markup.inlineKeyboard([
                        telegraf_1.Markup.button.callback('✅ Принять чат', `accept_chat:${room.id}`),
                    ]),
                });
            }
            catch (err) {
                console.error(`Failed to notify volunteer ${v.username} (TG: ${v.telegramId}):`, err);
            }
        }
    }
    async onAcceptChat(ctx) {
        const roomId = ctx.match[1];
        const tgUser = ctx.from;
        if (!tgUser)
            return;
        const volunteer = await this.prisma.volunteer.findFirst({
            where: { telegramId: BigInt(tgUser.id) },
        });
        if (!volunteer || !volunteer.isVerified) {
            return ctx.answerCbQuery('⛔️ Вы не авторизованы или не подтверждены как волонтёр.');
        }
        const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room || room.status !== 'waiting') {
            return ctx.editMessageText('⚠️ Этот чат уже принят другим волонтёром или закрыт.');
        }
        await this.prisma.chatRoom.update({
            where: { id: roomId },
            data: {
                volunteerId: volunteer.id,
                status: 'active',
            },
        });
        this.eventEmitter.emit('telegram.chat_accepted', {
            roomId,
            volunteerName: volunteer.displayName,
        });
        await ctx.answerCbQuery('✅ Чат принят! Теперь вы можете писать сюда сообщения.');
        return ctx.editMessageText(`💬 **Чат начат с ${room.anonNickname}**\n` +
            `Тема: ${room.topic}\n\n` +
            `Все сообщения, которые вы напишете сюда, будут отправлены подростку.\n` +
            `Чтобы завершить чат, просто напишите /end`, { parse_mode: 'Markdown' });
    }
    async handleMessageFromAnon(payload) {
        const { chatRoomId, content } = payload;
        const room = await this.prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: { volunteer: true },
        });
        if (room?.volunteer?.telegramId) {
            await this.bot.telegram.sendMessage(Number(room.volunteer.telegramId), content);
        }
    }
    async onMessage(text, ctx) {
        const tgUser = ctx.from;
        if (!tgUser)
            return;
        const activeRoom = await this.prisma.chatRoom.findFirst({
            where: {
                volunteer: { telegramId: BigInt(tgUser.id) },
                status: 'active',
            },
        });
        if (!activeRoom) {
            if (text === '/end')
                return ctx.reply('У вас нет активных чатов.');
            return ctx.reply('У вас сейчас нет активного чата. Подождите нового запроса.');
        }
        if (text === '/end') {
            await this.prisma.chatRoom.update({
                where: { id: activeRoom.id },
                data: { status: 'closed', closedAt: new Date() },
            });
            this.eventEmitter.emit('telegram.chat_closed', { roomId: activeRoom.id });
            return ctx.reply('✅ Чат успешно завершен.');
        }
        await this.chatService.saveMessage(activeRoom.id, text, 'volunteer');
        this.eventEmitter.emit('telegram.message', {
            roomId: activeRoom.id,
            content: text,
            senderType: 'volunteer',
        });
    }
};
exports.TelegramService = TelegramService;
__decorate([
    (0, nestjs_telegraf_1.Start)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramService.prototype, "onStart", null);
__decorate([
    (0, event_emitter_1.OnEvent)('room.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramService.prototype, "handleRoomCreated", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/accept_chat:(.+)/),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramService.prototype, "onAcceptChat", null);
__decorate([
    (0, event_emitter_1.OnEvent)('message.from_anon'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramService.prototype, "handleMessageFromAnon", null);
__decorate([
    (0, nestjs_telegraf_1.On)('text'),
    __param(0, (0, nestjs_telegraf_1.Message)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], TelegramService.prototype, "onMessage", null);
exports.TelegramService = TelegramService = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_telegraf_1.InjectBot)()),
    __metadata("design:paramtypes", [telegraf_1.Telegraf,
        prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        chat_service_1.ChatService,
        event_emitter_2.EventEmitter2])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map