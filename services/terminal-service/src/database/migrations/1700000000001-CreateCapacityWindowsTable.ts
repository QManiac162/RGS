import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCapacityWindowsTable1700000000001 implements MigrationInterface {
    name = 'CreateCapacityWindowsTable1700000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`CREATE TABLE "capacity_windows" (
            "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
            "terminal_code" VARCHAR(10) NOT NULL,
            "window_start" TIMESTAMPZ NOT NULL,
            "window_end" TIMESTAMPZ NOT NULL,
            "max_slots" INT NOT NULL,
            "booked_slots" INT NOT NULL DEFAULT 0,
            "created_at" TIMESTAMPZ NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMPZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_capacity_windows_id" PRIMARY KEY ("id"),
            CONSTRAINT "FK_capacity_windows_terminal_code" FOREIGN KEY ("terminal_code") REFERENCES "terminals"("code") ON DELETE CASCADE,
            CONSTRAINT "UQ_capacity_windows_terminal_start" UNIQUE ("terminal_code", "window_start"),
            CONSTRAINT "CHK_capacity_windows_slots" CHECK ("booked_slots" <= "max_slots"),
            CONSTRAINT "CHK_capacity_windows_window_order" CHECK ("window_end" > "window_start")
        );`);

        await queryRunner.query(`CREATE INDEX "IDX_capacity_windows_terminal_start"
            ON "capacity_windows" ("terminal_code", "window_start"
        );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "capacity_windows";`);
    }
}