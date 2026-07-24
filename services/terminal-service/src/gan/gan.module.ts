import { Module } from "@nestjs/common";
import { GanGeneratorService } from "./gan-generator.service";
@Module({
    providers: [GanGeneratorService],
    exports: [GanGeneratorService],
})
export class GanModule{}