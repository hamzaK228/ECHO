import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AdminService implements OnModuleInit {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    onModuleInit(): Promise<void>;
    login(dto: any): Promise<{
        access_token: string;
        admin: {
            id: string;
            username: string;
            displayName: string;
        };
    }>;
    getAllVolunteers(): Promise<{
        telegramId: string | null;
        username: string;
        displayName: string;
        id: string;
        isOnline: boolean;
        isVerified: boolean;
        level: number;
        rating: number;
        hoursCount: number;
        totalChats: number;
        createdAt: Date;
    }[]>;
    verifyVolunteer(id: string, isVerified: boolean): Promise<{
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
    }>;
    deleteVolunteer(id: string): Promise<{
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
    }>;
    getDashboardStats(): Promise<{
        volunteers: number;
        verifiedVolunteers: number;
        totalRooms: number;
        activeRooms: number;
        averageRating: number;
    }>;
}
