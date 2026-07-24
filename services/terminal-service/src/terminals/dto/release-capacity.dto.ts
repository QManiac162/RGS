import { IsISO8601, IsInt, Max, Min } from "class-validator";

export class ReleaseCapacityDto{
    @IsISO8601({ strict: true}, {message: 'windowStart must be a valid ISO8601 datetime string'})
    windowStart!: string;

    @IsInt({message: 'unitsToRelease must be an integer'})
    @Min(1, {message: 'unitsToRelease must be at least 1'})
    @Max(100, {message: 'unitsToRelease must not exceed 100'})
    unitsToRelease!: number;
}