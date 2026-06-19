import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getTelegramLinkCode(req: any): Promise<{
        code: string;
    }>;
}
