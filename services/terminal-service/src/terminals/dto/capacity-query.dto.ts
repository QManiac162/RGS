import { IsNotEmpty, Matches } from 'class-validator';

export class CapacityQueryDto{
    @IsNotEmpty({
        message: 'date is required'
    })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'date must be in YYYY-MM-DD format',
    })
    date: string;
}