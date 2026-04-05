import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot, Update, Start, Action, On, Message } from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { ChatService } from '../chat/chat.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Update()
@Injectable()
export class TelegramService implements OnModuleInit {
  private botId: number;

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private chatService: ChatService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const me = await this.bot.telegram.getMe();
    this.botId = me.id;
    console.log(`🤖 Telegram Bot [${me.username}] initialized.`);
  }

  @Start()
  async onStart(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Check if volunteer exists with this TG ID
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (!volunteer) {
      return ctx.reply(
        `👋 Привет! Я — ECHO Bot для волонтёров.\n\nТвой Telegram ID: ${tgUser.id}\nПожалуйста, свяжись с администратором, чтобы привязать этот ID к твоему аккаунту ECHO.`,
      );
    }

    return ctx.reply(
      `👋 С возвращением, ${volunteer.displayName}!\n\nСейчас я буду присылать сюда новые запросы на чат от подростков. Как только появится запрос, нажми "Принять", чтобы начать разговор.`,
    );
  }

  /**
   * Listen for new chat rooms created on the web
   */
  @OnEvent('room.created')
  async handleRoomCreated(room: { id: string; anonNickname: string; mood: string; topic: string }) {
    // Notify all verified volunteers with tied TG IDs
    const volunteers = await this.prisma.volunteer.findMany({
      where: {
        telegramId: { not: null },
        isVerified: true,
      },
    });

    const message =
      `🔔 **Новый запрос на чат!**\n\n` +
      `👤 Ник: ${room.anonNickname}\n` +
      `🎭 Настроение: ${room.mood}\n` +
      `💬 Тема: ${room.topic}\n\n` +
      `Нажми кнопку ниже, чтобы принять этот вызов.`;

    for (const v of volunteers) {
      try {
        await this.bot.telegram.sendMessage(Number(v.telegramId), message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            Markup.button.callback('✅ Принять чат', `accept_chat:${room.id}`),
          ]),
        });
      } catch (err) {
        console.error(
          `Failed to notify volunteer ${v.username} (TG: ${v.telegramId}):`,
          err,
        );
      }
    }
  }

  /**
   * Handle the "Accept Chat" button click
   */
  @Action(/accept_chat:(.+)/)
  async onAcceptChat(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const roomId = ctxMatch.match?.[1];
    if (!roomId) return;
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (!volunteer || !volunteer.isVerified) {
      return ctx.answerCbQuery(
        '⛔️ Вы не авторизованы или не подтверждены как волонтёр.',
      );
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || room.status !== 'waiting') {
      return ctx.editMessageText(
        '⚠️ Этот чат уже принят другим волонтёром или закрыт.',
      );
    }

    // Link volunteer to room
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        volunteerId: volunteer.id,
        status: 'active',
      },
    });

    // Notify the teenager via Socket.io bridge (handled in ChatGateway)
    this.eventEmitter.emit('telegram.chat_accepted', {
      roomId,
      volunteerName: volunteer.displayName,
    });

    await ctx.answerCbQuery(
      '✅ Чат принят! Теперь вы можете писать сюда сообщения.',
    );

    return ctx.editMessageText(
      `💬 **Чат начат с ${room.anonNickname}**\n` +
        `Тема: ${room.topic}\n\n` +
        `Все сообщения, которые вы напишете сюда, будут отправлены подростку.\n` +
        `Чтобы завершить чат, просто напишите /end`,
      { parse_mode: 'Markdown' },
    );
  }

  /**
   * Listen for incoming messages from the web (anon side)
   */
  @OnEvent('message.to_telegram')
  async handleMessageFromAnon(payload: { roomId: string; content: string }) {
    const { roomId, content } = payload;

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { volunteer: true },
    });

    if (room?.volunteer?.telegramId) {
      await this.bot.telegram.sendMessage(
        Number(room.volunteer.telegramId),
        content,
      );
    }
  }

  /**
   * Forward messages from Telegram volunteer to Web teenager
   */
  @On('text')
  async onMessage(@Message('text') text: string, ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Check if this volunteer is in an active room
    const activeRoom = await this.prisma.chatRoom.findFirst({
      where: {
        volunteer: { telegramId: BigInt(tgUser.id) },
        status: 'active',
      },
    });

    if (!activeRoom) {
      if (text === '/end') return ctx.reply('У вас нет активных чатов.');
      return ctx.reply(
        'У вас сейчас нет активного чата. Подождите нового запроса.',
      );
    }

    // Handle /end command to close the chat
    if (text === '/end') {
      await this.prisma.chatRoom.update({
        where: { id: activeRoom.id },
        data: { status: 'closed', closedAt: new Date() },
      });

      this.eventEmitter.emit('telegram.chat_closed', { roomId: activeRoom.id });
      return ctx.reply('✅ Чат успешно завершен.');
    }

    // Save message to DB and relay to web client
    await this.chatService.saveMessage(activeRoom.id, text, 'volunteer');

    this.eventEmitter.emit('telegram.message', {
      roomId: activeRoom.id,
      content: text,
      senderType: 'volunteer',
    });
  }
}
