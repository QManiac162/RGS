import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('rules_config')
export class RuleConfig {
    @PrimaryColumn({ name: 'rule_key', type: 'varchar', length: 100 })
    ruleKey!: string;

    @Column({ type: 'varchar', length: 255 })
    value!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    description!: string | null;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
}