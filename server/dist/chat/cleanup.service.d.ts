import { PrismaService } from '../prisma/prisma.service';
export declare class CleanupService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleMessageCleanup(): Promise<void>;
    handleDailyStats(): Promise<void>;
}
