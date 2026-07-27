export interface CapacityReservationResult{
    terminalCode: string;
    windowStart: string;
    windowEnd: string;
    maxSlots: number;
    bookedSlots: number;
    availableSlots: number;
}

export interface GanResult{
    gan: string;
}

export interface RuleResult{
    ruleKey: string;
    value: string;
    description: string | null;
    active: boolean;
}