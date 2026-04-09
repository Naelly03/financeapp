import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser, JwtPayload } from '../../common/decorators';
import { UserResponseDto } from './dto/user-response.dto';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    const found = await this.usersService.findById(user.sub);
    const { id, name, email, plan, createdAt } = found!;
    return { id, name, email, plan, createdAt };
  }
}
