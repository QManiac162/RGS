import { Module } from "@nestjs/common";
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleConfig } from "src/database/entities/rule-config.entity";
import { RuleController } from "./rules.controller";
import { RulesService } from "./rules.service";

@Module({
    imports: [TypeOrmModule.forFeature([RuleConfig])],
    controllers: [RuleController],
    providers: [RulesService],
})
export class RulesModule {}