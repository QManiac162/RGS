import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { CapacityReservationResult, GanResult, RuleResult } from './dto/terminal-client.interface';

@Injectable()
export class TerminalClientService {
    constructor(private readonly httpService: HttpService) {}

    async reserveCapacity(terminalCode: string, windowStartIso: string, unitsRequested: number): Promise<CapacityReservationResult> {
        try{
            const response = await firstValueFrom(
                this.httpService.post<CapacityReservationResult>(`/terminals/${terminalCode}/capacity/reserve`, {
                    windowStart: windowStartIso,
                    unitsRequested
                }),
            );
            return response.data;
        } catch(err){
            throw this.toHttpException(err, 'capacity reservation');
        }
    }

    async releaseCapacity(terminalCode: string, windowStartIso: string, unitsToRelease: number): Promise<CapacityReservationResult> {
        try{
            const response = await firstValueFrom(
                this.httpService.post<CapacityReservationResult>(`/terminals/${terminalCode}/capacity/release`, {
                    windowStart: windowStartIso,
                    unitsToRelease
                }),
            );
            return response.data;
        } catch(err){
            throw this.toHttpException(err, 'capacity release');
        }
    }

    async getNextGan(terminalCode: string, datestr: string): Promise<string> {
        try{
            const response = await firstValueFrom(
                this.httpService.get<GanResult>(`/terminals/${terminalCode}/gan/next`, {
                    params: { date: datestr }
                }),
            );
            return response.data.gan;
        } catch(err){
            throw this.toHttpException(err, 'GAN generation');
        }
    }

    async getActiveRules(): Promise<RuleResult[]> {
        try{
            const response = await firstValueFrom(
                this.httpService.get<RuleResult[]>(`/rules`),
            );
            return response.data;
        } catch(err){
            throw this.toHttpException(err, 'rules lookup');
        }
    }

    private toHttpException(err: unknown, context: string): HttpException {
        if(axios.isAxiosError(err)){
            if(err.response){
                const data = err.response.data as | { message?: string; error?: string } | undefined;
                return new HttpException(
                    {
                        statusCode: err.response.status,
                        error: data?.error ?? 'UPSTREAM_ERROR',
                        message: data?.message ?? `Upstream error during ${context}`,
                    },
                    err.response.status,
                );
            }
            return new ServiceUnavailableException(`terminal service unavailable during ${context}`);
        }
        return new ServiceUnavailableException(`Unexpected error during ${context}`);
    }
}