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
var CleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let CleanupService = CleanupService_1 = class CleanupService {
    prisma;
    logger = new common_1.Logger(CleanupService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleMessageCleanup() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deletedMessages = await this.prisma.message.deleteMany({
            where: {
                chatRoom: {
                    status: 'closed',
                    closedAt: { lt: cutoff },
                },
            },
        });
        const deletedRooms = await this.prisma.chatRoom.deleteMany({
            where: {
                status: 'closed',
                closedAt: { lt: cutoff },
            },
        });
        const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
        const deletedStaleMessages = await this.prisma.message.deleteMany({
            where: {
                chatRoom: {
                    status: 'waiting',
                    createdAt: { lt: staleCutoff },
                },
            },
        });
        const deletedStaleRooms = await this.prisma.chatRoom.deleteMany({
            where: {
                status: 'waiting',
                createdAt: { lt: staleCutoff },
            },
        });
        if (deletedMessages.count > 0 || deletedRooms.count > 0 || deletedStaleRooms.count > 0) {
            this.logger.log(`🧹 Cleanup: ${deletedMessages.count + deletedStaleMessages.count} messages, ` +
                `${deletedRooms.count + deletedStaleRooms.count} rooms deleted`);
        }
    }
    async handleDailyStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const roomsToday = await this.prisma.chatRoom.count({
            where: { createdAt: { gte: today } },
        });
        const messagesToday = await this.prisma.message.count({
            where: { createdAt: { gte: today } },
        });
        this.logger.log(`📊 Daily stats: ${roomsToday} rooms, ${messagesToday} messages today`);
    }
};
exports.CleanupService = CleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CleanupService.prototype, "handleMessageCleanup", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CleanupService.prototype, "handleDailyStats", null);
exports.CleanupService = CleanupService = CleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupService);
//# sourceMappingURL=cleanup.service.js.map