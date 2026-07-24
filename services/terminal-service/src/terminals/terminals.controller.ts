import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { TerminalsService } from "./terminals.service";
import { CapacityLockService } from "./capacity-lock.service";
import { GanGeneratorService } from "src/gan/gan-generator.service";
import { TerminalResponseDto } from "./dto/terminal-response.dto";
import { CapacityWindowResponseDto } from "./dto/capacity-window-response.dto";
import { CapacityQueryDto } from "./dto/capacity-query.dto";
import { ReserveCapacityDto } from "./dto/reserve-capacity.dto";
import { ReleaseCapacityDto } from "./dto/release-capacity.dto";
import { CapacityReservationResponseDto } from "./dto/capacity-reservation-response.dto";
import { TerminalStatus } from "src/database/entities/terminal-status.enum";

@Controller('terminals')
export class TerminalsController {
    constructor(
        private readonly terminalsService: TerminalsService, 
        private readonly capacityLockService: CapacityLockService,
        private readonly ganGeneratorService: GanGeneratorService
    ){}

    @Get()
    findAll(): Promise<TerminalResponseDto[]>{
        return this.terminalsService.findAll();
    }

    @Get(':code')
    findOne(@Param('code') code: string): Promise<TerminalResponseDto>{
        return this.terminalsService.findByCode(code);
    }

    @Get(':code/capacity')
    getCapacity(@Param('code') code: string, @Query() query: CapacityQueryDto): Promise<CapacityWindowResponseDto[]>{
        return this.terminalsService.getCapacityForDate(code, query.date);
    }

    @Post(':code/capacity/reserve')
    @HttpCode(HttpStatus.OK)
    reserveCapacity(@Param('code') code: string, @Body() dto: ReserveCapacityDto): Promise<CapacityReservationResponseDto>{
        return this.capacityLockService.reserveCapacity(code, dto.windowStart, dto.unitsRequested);
    }

    @Post(':code/capacity/release')
    @HttpCode(HttpStatus.OK)
    releaseCapacity(@Param('code') code: string, @Body() dto: ReleaseCapacityDto): Promise<CapacityReservationResponseDto>{
        return this.capacityLockService.releaseCapacity(code, dto.windowStart, dto.unitsToRelease);
    }

    @Get(':code/gan/next')
    async getNextGan(@Param('code') code: string, @Query() query: CapacityQueryDto): Promise<{gan: string}>{
        const terminal = await this.terminalsService.findByCode(code);
        if(terminal.status === TerminalStatus.UPCOMING){
            throw new BadRequestException(`Terminal '${terminal.code} is not yet operational`,);
        }
        const gan = await this.ganGeneratorService.generateNext(terminal.code, query.date);
        return {gan};
    }
}