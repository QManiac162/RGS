import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Terminal } from '../database/entities/terminal.entity';
import { CapacityWindow } from "../database/entities/capacity-window.entity";
import { TerminalStatus } from "../database/entities/terminal-status.enum";
import { TerminalResponseDto } from "./dto/terminal-response.dto";
import { CapacityWindowResponseDto } from "./dto/capacity-window-response.dto";

@Injectable()
export class TerminalsService{
    constructor(
        @InjectRepository(Terminal) private readonly terminalRepo: Repository<Terminal>,
        @InjectRepository(CapacityWindow) private readonly capacityRepo: Repository<CapacityWindow>,
    ){}
    async findAll(): Promise<TerminalResponseDto[]>{
        const terminals = await this.terminalRepo.find({
            order: {
                code: 'ASC'
            }
        });
        return terminals.map((t) => this.toTerminalDto(t));
    }
    async findByCode(code: string): Promise<TerminalResponseDto>{
        const terminal = await this.terminalRepo.findOne({
            where: {
                code: code.toUpperCase()
            },
        });
        if(!terminal){
            throw new NotFoundException(`Terminal '${code}' not found`);
        }
        return this.toTerminalDto(terminal);
    }
    async getCapacityForDate(code: string, dateStr: string,): Promise<CapacityWindowResponseDto[]>{
        const terminal = await this.terminalRepo.findOne({
            where: {
                code: code.toUpperCase()
            },
        });
        if(!terminal){
            throw new NotFoundException(`Terminal '${code}' not found`);
        }
        if(terminal.status === TerminalStatus.UPCOMING){
            throw new BadRequestException(`Terminal '${terminal.code}' is not yet operational`,);
        }

        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        if(isNaN(dayStart.getTime())){
            throw new BadRequestException('Invalid date value');
        }
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate()+1);
        const windows = await this.capacityRepo.find({
            where: {
                terminalCode: terminal.code,
                windowStart: Between(dayStart, dayEnd),
            },
            order:{
                windowStart: 'ASC'
            },
        });
        return windows.map((w) => this.toCapacityDto(w));
    }
    private toTerminalDto(terminal: Terminal): TerminalResponseDto{
        return{
            code: terminal.code,
            name: terminal.name,
            lanes: terminal.lanes,
            status: terminal.status,
            opensAt: terminal.opensAt ? terminal.opensAt.toISOString() : null,
        };
    }

    private toCapacityDto(window: CapacityWindow): CapacityWindowResponseDto {
        return{
            id: window.id,
            terminalCode: window.terminalCode,
            windowStart: window.windowStart.toISOString(),
            windowEnd: window.windowEnd.toISOString(),
            maxSlots: window.maxSlots,
            bookedSlots: window.bookedSlots,
            availableSlots: window.maxSlots-window.bookedSlots,
        };
    }
}