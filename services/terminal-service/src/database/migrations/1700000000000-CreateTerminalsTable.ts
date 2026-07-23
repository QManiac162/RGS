import { MigrationIInterface, QueryRunner } from "typeorm";

export class CreateTerminalsTable1700000000000 implements MigrationIInterface {
    name = 'CreateTerminalsTable1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "terminal_status_enum" AS ENUM('ACTIVE', 'UPCOMING')`);

        await queryRunner.query(`CREATE TABLE "terminals" (
            "code" VARCHAR(10) NOT NULL,
            "name" VARCHAR(100) NOT NULL,
            "lanes" INT NOT NULL,
            "status" "terminal_status_enum" NOT NULL DEFAULT 'ACTIVE',
            "opens_at" TIMESTAMPZ NULL,
            "created_at" TIMESTAMPZ NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMPZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_terminals_code" PRIMARY KEY ("code")
        );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "terminals"`);
        await queryRunner.query(`DROP TYPE "terminal_status_enum"`);
    }
}