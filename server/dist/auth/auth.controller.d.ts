import { AuthService } from './auth.service';
import { RegisterVolunteerDto, LoginVolunteerDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    getProfile(req: any): any;
}
