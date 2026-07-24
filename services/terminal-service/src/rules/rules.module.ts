import { Module } from "@nestjs/common";
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleConfig } from "../database/entities/rule-config.entity";
import { RulesController } from "./rules.controller";
import { RulesService } from "./rules.service";

@Module({
    imports: [TypeOrmModule.forFeature([RuleConfig])],
    controllers: [RulesController],
    providers: [RulesService],
})
export class RulesModule {}