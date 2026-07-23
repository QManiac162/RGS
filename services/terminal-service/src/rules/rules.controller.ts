import { Controller, Get } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RuleResponseDto } from './dto/rule-response.dto';

@Controller('rules')
export class RuleController{
    constructor(private readonly rulesService: RulesService){}

    @Get()
    findAllActive(): Promise<RuleResponseDto[]>{
        return this.rulesService.findAllActive();
    }
}