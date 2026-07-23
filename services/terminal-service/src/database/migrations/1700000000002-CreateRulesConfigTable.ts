import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRulesConfigTable1700000000002 implements MigrationInterface{
    name = 'CreateRulesConfigTable1700000000002';

    public async up(queryRunner: QueryRunner): Promise<void>{
        await queryRunner.query(`CREATE TABLE "rules_config"(
            "rule_key" VARCHAR(100) NOT NULL,
            "value" VARCHAR(255) NOT NULL,
            "description" VARCHAR(500) NULL,
            "active" BOOLEAN NOT NULL DEFAULT true,
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_rules_config_rule_key" PRIMARY KEY ("rule_key")
        );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void>{
        await queryRunner.query(`DROP TABLE "rules_config";`);
    }
}