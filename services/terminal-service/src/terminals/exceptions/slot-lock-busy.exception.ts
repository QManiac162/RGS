import { HttpException, HttpStatus } from "@nestjs/common";

export class SlotLockBusyException extends HttpException{
    constructor(terminalCode: string, windowStartIso: string){
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                error: 'SLOT_LOCK_BUSY',
                message: `Slot ${terminalCode} @ ${windowStartIso} is currently being booked by another request. Please retry shortly.`,
            },
            HttpStatus.CONFLICT,
        );
    }
}