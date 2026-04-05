"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
let AdminService = class AdminService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async onModuleInit() {
        const adminCount = await this.prisma.admin.count();
        if (adminCount === 0) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            await this.prisma.admin.create({
                data: {
                    username: 'admin',
                    passwordHash,
                    displayName: 'System Administrator',
                },
            });
            console.log('✅ Default admin created: admin / admin123');
        }
    }
    async login(dto) {
        const admin = await this.prisma.admin.findUnique({
            where: { username: dto.username },
        });
        if (!admin) {
            throw new common_1.UnauthorizedException('Invalid admin credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid admin credentials');
        }
        const token = this.jwtService.sign({
            sub: admin.id,
            username: admin.username,
            role: 'admin',
        });
        return {
            access_token: token,
            admin: {
                id: admin.id,
                username: admin.username,
                displayName: admin.displayName,
            },
        };
    }
    async getAllVolunteers() {
        const volunteers = await this.prisma.volunteer.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                displayName: true,
                telegramId: true,
                isVerified: true,
                isOnline: true,
                level: true,
                rating: true,
                hoursCount: true,
                totalChats: true,
                createdAt: true,
            },
        });
        return volunteers.map((v) => ({
            ...v,
            telegramId: v.telegramId ? v.telegramId.toString() : null,
        }));
    }
    async verifyVolunteer(id, isVerified) {
        return this.prisma.volunteer.update({
            where: { id },
            data: { isVerified },
        });
    }
    async deleteVolunteer(id) {
        return this.prisma.volunteer.delete({
            where: { id },
        });
    }
    async getDashboardStats() {
        const volunteers = await this.prisma.volunteer.count();
        const verifiedVolunteers = await this.prisma.volunteer.count({ where: { isVerified: true } });
        const totalRooms = await this.prisma.chatRoom.count();
        const activeRooms = await this.prisma.chatRoom.count({ where: { status: 'active' } });
        const aggregate = await this.prisma.volunteer.aggregate({
            _avg: { rating: true },
        });
        return {
            volunteers,
            verifiedVolunteers,
            totalRooms,
            activeRooms,
            averageRating: aggregate._avg.rating || 0,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AdminService);
//# sourceMappingURL=admin.service.js.map