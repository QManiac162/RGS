import { Module } from "@nestjs/common";
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terminal } from "../database/entities/terminal.entity";
import { CapacityWindow } from "../database/entities/capacity-window.entity";
import { TerminalsController } from "./terminals.controller";
import { TerminalsService } from "./terminals.service";
import { CapacityLockService } from "./capacity-lock.service";
import { GanModule } from "src/gan/gan.module";

@Module({
    imports: [TypeOrmModule. forFeature([Terminal, CapacityWindow]), GanModule],
    controllers: [TerminalsController],
    providers: [TerminalsService, CapacityLockService],
})
export class TerminalsModule{}