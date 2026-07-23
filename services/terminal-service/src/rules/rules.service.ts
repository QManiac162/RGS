import { Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleConfig } from "../database/entities/rule-config.entity";
import { RuleResponseDto } from "./dto/rule-response.dto";

@Injectable()
export class RulesService{
    constructor(
        @InjectRepository(RuleConfig) 
        private readonly ruleRepo: Repository<RuleConfig>,
    ){}

    async findAllActive(): Promise<RuleResponseDto[]>{
        const rules = await this.ruleRepo.find({
            where: {
                active: true
            },
            order: {
                ruleKey: 'ASC'
            },
        });
        return rules.map((r) => ({
            ruleKey: r.ruleKey,
            value: r.value,
            description: r.description,
            active: r.active,
        }));
    }
}