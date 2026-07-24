import { HttpException, HttpStatus } from "@nestjs/common";

export class CapacityExceededException extends HttpException{
    constructor(
        terminalCode: string,
        windowStartIso: string,
        availableSlots: number,
        unitsRequested: number,
    ){
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                error: 'CAPACITY_EXCEEDED',
                message: `Requested ${unitsRequested} unit(s) exceeds available capacity (${terminalCode} @ ${windowStartIso})`,
            },
            HttpStatus.CONFLICT,
        );
    }
}