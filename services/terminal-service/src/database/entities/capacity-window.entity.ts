import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('capacity_windows')
export class CapacityWindow {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'terminal_code', type: 'varchar', length: 10 })
    terminalCode!: string;

    @Column({ name: 'window_start', type: 'timestamptz' })
    windowStart!: Date;

    @Column({ name: 'window_end', type: 'timestamptz' })
    windowEnd!: Date;

    @Column({ name: 'max_slots', type: 'int' })
    maxSlots!: number;

    @Column({ name: 'booked_slots', type: 'int', default: 0 })
    bookedSlots!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}