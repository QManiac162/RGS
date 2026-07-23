import { Module } from "@nestjs/common";
import { TypeOrmModule } from '@nestjs/typeorm';
import { Terminal } from "../database/entities/terminal.entity";
import { CapacityWindow } from "../database/entities/capacity-window.entity";
import { TerminalsController } from "./terminals.controller";
import { TerminalsService } from "./terminals.service";

@Module({
    imports: [TypeOrmModule. forFeature([Terminal, CapacityWindow])],
    controllers: [TerminalsController],
    providers: [TerminalsService],
})
export class TerminalsModule{}