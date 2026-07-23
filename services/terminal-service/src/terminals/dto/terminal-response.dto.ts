import { TerminalStatus } from "../../database/entities/terminal-status.enum";

export class TerminalResponseDto{
    code: string;
    name: string;
    lanes: number;
    status: TerminalStatus;
    opensAt: string | null;
}