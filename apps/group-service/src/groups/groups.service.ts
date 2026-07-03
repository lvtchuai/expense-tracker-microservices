import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupExpense } from './entities/group-expense.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AuthClient } from '../auth/auth.client';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(GroupExpense)
    private readonly expenses: Repository<GroupExpense>,
    private readonly authClient: AuthClient,
  ) {}

  // --- groups ---

  async create(user: { sub: string; email: string }, dto: CreateGroupDto) {
    const group = this.groups.create({ name: dto.name, ownerId: user.sub });
    // Creator is automatically the first member.
    group.members = [
      this.members.create({
        userId: user.sub,
        email: user.email,
        displayName: user.email.split('@')[0],
      }),
    ];
    return this.groups.save(group);
  }

  /** Groups the user is a member of. */
  async listForUser(userId: string) {
    const memberships = await this.members.find({
      where: { userId },
      relations: ['group'],
    });
    const groupIds = memberships.map((m) => m.group.id);
    if (groupIds.length === 0) return [];

    // Load each group with member count + expense total for the list view.
    const result: {
      id: string;
      name: string;
      ownerId: string;
      memberCount: number;
      totalSpent: string;
    }[] = [];
    for (const id of groupIds) {
      const group = await this.groups.findOne({
        where: { id },
        relations: ['members'],
      });
      if (!group) continue;
      const total = await this.expenses
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .where('e.group_id = :id', { id })
        .getRawOne<{ total: string }>();
      result.push({
        id: group.id,
        name: group.name,
        ownerId: group.ownerId,
        memberCount: group.members.length,
        totalSpent: Number(total?.total ?? 0).toFixed(2),
      });
    }
    return result;
  }

  /** Full group detail — enforces membership. */
  async getDetail(userId: string, groupId: string) {
    const group = await this.requireMembership(userId, groupId);
    const expenses = await this.expenses.find({
      where: { groupId },
      order: { occurredAt: 'DESC' },
    });
    return {
      id: group.id,
      name: group.name,
      ownerId: group.ownerId,
      members: group.members.map((m) => ({
        userId: m.userId,
        email: m.email,
        displayName: m.displayName ?? null,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        paidBy: e.paidBy,
        amount: e.amount,
        description: e.description,
        participantIds: e.participantIds,
        occurredAt: e.occurredAt,
      })),
      balances: this.computeBalances(group.members, expenses),
    };
  }

  // --- members ---

  async addMember(userId: string, groupId: string, email: string) {
    const group = await this.requireMembership(userId, groupId);

    const resolved = await this.authClient.findByEmail(email);
    if (group.members.some((m) => m.userId === resolved.id)) {
      throw new BadRequestException('user is already a member');
    }
    const member = this.members.create({
      group,
      userId: resolved.id,
      email: resolved.email,
      displayName: resolved.displayName ?? undefined,
    });
    await this.members.save(member);
    return this.getDetail(userId, groupId);
  }

  // --- expenses ---

  async addExpense(userId: string, groupId: string, dto: CreateExpenseDto) {
    const group = await this.requireMembership(userId, groupId);
    const memberIds = new Set(group.members.map((m) => m.userId));

    if (!memberIds.has(dto.paidBy)) {
      throw new BadRequestException('payer must be a group member');
    }
    for (const pid of dto.participantIds) {
      if (!memberIds.has(pid)) {
        throw new BadRequestException(
          'all participants must be group members',
        );
      }
    }

    const expense = this.expenses.create({
      group,
      groupId,
      paidBy: dto.paidBy,
      amount: dto.amount.toFixed(2),
      description: dto.description,
      participantIds: dto.participantIds,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
    });
    await this.expenses.save(expense);
    return this.getDetail(userId, groupId);
  }

  // --- balances (the core "who owes whom") ---

  /**
   * Net balance per member: (what they paid) − (their share of expenses).
   * Positive = owed money; negative = owes money. Then greedily match
   * debtors to creditors to produce a minimal settlement plan.
   */
  private computeBalances(members: GroupMember[], expenses: GroupExpense[]) {
    const net = new Map<string, number>();
    members.forEach((m) => net.set(m.userId, 0));

    for (const e of expenses) {
      const amount = Number(e.amount);
      const parts = e.participantIds.filter((p) => net.has(p));
      if (parts.length === 0) continue;
      const share = amount / parts.length;

      // Payer is credited the full amount…
      net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + amount);
      // …and every participant is debited their share.
      for (const p of parts) {
        net.set(p, (net.get(p) ?? 0) - share);
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const perMember = members.map((m) => ({
      userId: m.userId,
      displayName: m.displayName ?? m.email,
      net: round(net.get(m.userId) ?? 0),
    }));

    return {
      perMember,
      settlements: this.settle(perMember),
    };
  }

  /** Greedy debt simplification → list of {from, to, amount}. */
  private settle(perMember: { userId: string; net: number }[]) {
    const creditors = perMember
      .filter((m) => m.net > 0.005)
      .map((m) => ({ ...m }))
      .sort((a, b) => b.net - a.net);
    const debtors = perMember
      .filter((m) => m.net < -0.005)
      .map((m) => ({ ...m, net: -m.net }))
      .sort((a, b) => b.net - a.net);

    const settlements: { from: string; to: string; amount: string }[] = [];
    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const pay = Math.min(creditors[ci].net, debtors[di].net);
      settlements.push({
        from: debtors[di].userId,
        to: creditors[ci].userId,
        amount: pay.toFixed(2),
      });
      creditors[ci].net -= pay;
      debtors[di].net -= pay;
      if (creditors[ci].net < 0.005) ci++;
      if (debtors[di].net < 0.005) di++;
    }
    return settlements;
  }

  // --- helpers ---

  private async requireMembership(userId: string, groupId: string) {
    const group = await this.groups.findOne({
      where: { id: groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('group not found');
    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('you are not a member of this group');
    }
    return group;
  }
}
