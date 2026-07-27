import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAppointmentsTable1700000100000 implements MigrationInterface {
    name = 'CreateAppointmentsTable1700000100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "appointments_service_type_enum" AS ENUM('DROP_OFF', 'PICK_UP', 'DROP_AND_PICK')`);
        await queryRunner.query(`CREATE TYPE "appointments_status_enum" AS ENUM('CONFIRMED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "appointments" (
            "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
            "gan" VARCHAR(40) NOT NULL,
            "carrier_id" VARCHAR(50) NOT NULL,
            "terminal_code" VARCHAR(10) NOT NULL,
            "service_type" "appointments_service_type_enum" NOT NULL,
            "booking_number" VARCHAR(50) NOT NULL,
            "train_reservation_id" VARCHAR(50) NULL,
            "container_id" VARCHAR(50) NOT NULL,
            "scheduled_start" TIMESTAMPTZ NOT NULL,
            "scheduled_end" TIMESTAMPTZ NOT NULL,
            "units_reserved" INT NOT NULL,
            "status" "appointments_status_enum" NOT NULL DEFAULT 'CONFIRMED',
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_appointments_gan" UNIQUE ("gan")
        );`);
        await queryRunner.query(`CREATE INDEX "IDX_appointments_carrier_scheduled_start" ON "appointments" ("carrier_id", "scheduled_start")`);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "appointments_status_enum"`);
        await queryRunner.query(`DROP TYPE "appointments_service_type_enum"`);
    }
}
