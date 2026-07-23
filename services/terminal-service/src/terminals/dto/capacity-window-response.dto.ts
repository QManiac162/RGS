export class CapacityWindowResponseDto{
    id: string;
    terminalCode: string;
    windowStart: string;
    windowEnd: string;
    maxSlots: number;
    bookedSlots: number;
    availableSlots: number;
}