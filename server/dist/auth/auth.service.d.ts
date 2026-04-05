import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVolunteerDto, LoginVolunteerDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterVolunteerDto): Promise<{
        access_token: string;
        volunteer: {
            id: string;
            username: string;
            displayName: string;
        };
    }>;
    login(dto: LoginVolunteerDto): Promise<{
        access_token: string;
        volunteer: {
            id: string;
            username: string;
            displayName: string;
        };
    }>;
    validateVolunteer(payload: {
        sub: string;
    }): Promise<{
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
    } | null>;
}
