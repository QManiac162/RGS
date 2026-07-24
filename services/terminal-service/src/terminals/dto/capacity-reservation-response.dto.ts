export class CapacityReservationResponseDto{
    terminalCode!: string;
    windowStart!: string;
    windowEnd!: string;
    maxSlots!: number;
    bookedSlots!: number;
    availableSlots!: number;
}