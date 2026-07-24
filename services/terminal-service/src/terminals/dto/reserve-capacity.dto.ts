import { IsISO8601, IsInt, Max, Min } from "class-validator";

export class ReserveCapacityDto{
    @IsISO8601({strict: true}, {message: 'windowStart must be a valid ISO8601 datetime string'})
    windowStart!: string;

    @IsInt({message: 'unitsRequested must be an integer'})
    @Min(1, {message: 'unitsRequested must be at least 1'})
    @Max(100, {message: 'unitsRequested must not exceed 100'})
    unitsRequested!: number;
}