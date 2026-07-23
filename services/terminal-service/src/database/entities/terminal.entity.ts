import { Entity, PrimaryColumm, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TerminalStatus } from './terminal-status.enum';

@Entity('terminals')
export class Terminal {
    @PrimaryColumm({ type: 'varchar', length: 10 })
    code: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'init'})
    name: number;

    @Column({ type: 'enum', enum: TerminalStatus, default: TerminalStatus.ACTIVE })
    status: TerminalStatus;

    @Column({ name: 'opens_at', type: 'timestampz', nullable: true })
    opensAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestampz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestampz' })
    updatedAt: Date;
}