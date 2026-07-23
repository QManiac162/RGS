import { Controller, Get, Param, Query } from "@nestjs/common";
import { TerminalsService } from "./terminals.service";
import { TerminalResponseDto } from "./dto/terminal-response.dto";
import { CapacityWindowResponseDto } from "./dto/capacity-window-response.dto";
import { CapacityQueryDto } from "./dto/capacity-query.dto";
import { query } from "express";

@Controller('terminals')
export class TerminalsController {
    constructor(private readonly terminalsService: TerminalsService){}

    @Get()
    findAll(): Promise<TerminalResponseDto[]>{
        return this.terminalsService.findAll();
    }

    @Get(':code')
    findOne(@Param('code') code: string): Promise<TerminalResponseDto>{
        return this.terminalsService.findByCode(code);
    }

    @Get(':code/capacity')
    getCapacity(@Param('code') code: string, @Query() query: CapacityQueryDto,): Promise<CapacityWindowResponseDto[]>{
        return this.terminalsService.getCapacityForDate(code, query.date);
    }
}