import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupExpense } from './entities/group-expense.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AuthClient } from '../auth/auth.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, GroupExpense]),
    PassportModule,
    ConfigModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, JwtStrategy, AuthClient],
})
export class GroupsModule {}
