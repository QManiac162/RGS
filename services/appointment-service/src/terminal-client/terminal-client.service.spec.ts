import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException, HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders } from 'axios';
import { TerminalClientService } from './terminal-client.service';

describe('TerminalClientService', () => {
    let service: TerminalClientService;
    let httpService: {
        post: jest.Mock;
        get: jest.Mock;
    };

    beforeEach(async () => {
        httpService = {
            post: jest.fn(),
            get: jest.fn(),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TerminalClientService,
                { provide: HttpService, useValue: httpService },
            ],
        }).compile();
        service = module.get<TerminalClientService>(TerminalClientService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('returns reservation data on success', async () => {
        httpService.post.mockReturnValue(
            of({ 
                data: { 
                    terminalCode: 'IRN',
                    windowStart: '2026-07-20T08:00:00Z',
                    windowEnd: '2026-07-20T09:00:00Z',
                    maxSlots: 16,
                    bookedSlots: 3,
                    availableSlots: 13 
                } ,
            }),
        );
        const result = await service.reserveCapacity('IRN', '2026-07-20T08:00:00Z', 1);
        expect(result.availableSlots).toBe(13);
    });

    it('propagates the upstream status code and message on a 409 response', async () => {
        const axiosError: AxiosError = new AxiosError('Request failed', '409', {headers: new AxiosHeaders()},
        {},
        {
            status: 409,
            statusText: 'Conflict',
            headers: {},
            config: {headers: new AxiosHeaders()},
            data: {statusCode: 409, error: 'CAPACITY_EXCEEDED', message: 'Requested 5 exceeds available'},
        });
        httpService.post.mockReturnValue(throwError(() => axiosError));
        await expect(service.reserveCapacity('IRN', '2026-07-20T08:00:00Z', 5)).rejects.toMatchObject({ status: 409 });
    });

    it('throws ServiceUnavailableException when there is no response at all', async () => {
        const axiosError: AxiosError = new AxiosError('Request failed', 'ECONNREFUSED', undefined, {});
        httpService.post.mockReturnValue(throwError(() => axiosError));
        await expect(service.getActiveRules()).rejects.toThrow(ServiceUnavailableException);
    });

    it('extract the gan string from the response', async () => {
        httpService.get.mockReturnValue(of({ data: { gan: 'GAN-IRN-20260720-000001' } }));
        const gan = await service.getNextGan('IRN', '2026-07-20');
        expect(gan).toBe('GAN-IRN-20260720-000001');
    });
});