import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TerminalStatus } from './terminal-status.enum';

@Entity('terminals')
export class Terminal {
    @PrimaryColumn({ type: 'varchar', length: 10 })
    code!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'int' })
    lanes!: number;

    @Column({ type: 'enum', enum: TerminalStatus, default: TerminalStatus.ACTIVE })
    status!: TerminalStatus;

    @Column({ name: 'opens_at', type: 'timestamptz', nullable: true })
    opensAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}