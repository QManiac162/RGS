import { AppDataSource } from "../data-source";
import { Terminal } from "../entities/terminal.entity";
import { CapacityWindow } from "../entities/capacity-window.entity";
import { RuleConfig } from "../entities/rule-config.entity";
import { TerminalStatus } from "../entities/terminal-status.enum";

interface TerminalSeed{
    code: string;
    name: string;
    lanes: number;
    status: TerminalStatus;
    opensAt: Date | null;
}

const TERMINAL_SEEDS: TerminalSeed[]=[
    { code: 'IRN', name: 'Irongate', lanes: 8, status: TerminalStatus.ACTIVE, opensAt: null },
    { code: 'STL', name: 'Steelyard', lanes: 6, status: TerminalStatus.ACTIVE, opensAt: null },
    { code: 'EMB', name: 'Emberport', lanes: 4, status: TerminalStatus.ACTIVE, opensAt: null },
    { code: 'SLT', name: 'Slatedock', lanes: 3, status: TerminalStatus.ACTIVE, opensAt: null },
    { code: 'FLN', name: 'Flintbay', lanes: 5, status: TerminalStatus.UPCOMING, opensAt: new Date('2026-10-01T00:00:00.000Z') },
    { code: 'ASH', name: 'Ashridge', lanes: 6, status: TerminalStatus.UPCOMING, opensAt: new Date('2026-12-01T00:00:00.000Z') },
];

interface RuleSeed {
    ruleKey: string;
    value: string;
    description: string;
}

const RULE_SEED: RuleSeed[] = [
    { ruleKey: 'booking.window.max_days', value: '3', description: 'Max business days in advance a slot can be booked'},
    { ruleKey: 'booking.window.cutoff_hours', value: '2', description: 'Minimum '},
    { ruleKey: 'capacity.max_per_hour.IRN', value: '40', description: 'Max Appointments per hour at IronGate'},
    { ruleKey: 'capacity.max_per_hour.STL', value: '25', description: 'Max Appointments per hour at Steelyard'},
    { ruleKey: 'capacity.max_per_hour.EMB', value: '15', description: 'Max Appointments per hour at Emberport'},
    { ruleKey: 'capacity.max_per_hour.SLT', value: '10', description: 'Max Appointments per hour at Slatedock'},
    { ruleKey: 'service.drop_and_pick.dual_slot', value: 'true', description: 'Whether drop & pickup consumes two capacity units'},
    { ruleKey: 'noshow.grace_minutes', value: '', description: 'Grace period in minutes before an unattended appointment is auto-cancelled'},
    { ruleKey: 'reschedule.min_notice_hours', value: '', description: 'Minimum notice in hours required to reschedule an appointment'},
    { ruleKey: 'carrier.daily_quota', value: '', description: 'Max active appointments per carrier per day'},
    { ruleKey: 'train.reservation.required', value: '', description: 'Whether a valid train reservation is required for an appointment'},
];

const WINDOW_START_HOUR = 8;
const WINDOW_END_HOUR = 18;
const DAYS_TO_SEED = 3;

function maxSlotsFor(lanes: number): number {
    return lanes*2;
}

async function seedTerminals(): Promise<void> {
    const repo = AppDataSource.getRepository(Terminal);
    for (const seed of TERMINAL_SEEDS) {
        const existing = await repo.findOne({ 
            where: {
                code: seed.code
            }
        });
        if(existing){
            console.log(`[seed] terminal ${seed.code} already exists, skipping`);
            continue;
        }
        await repo.save(repo.create(seed));
        console.log(`[seed] inserted terminal ${seed.code} (${seed.name})`);
    } 
}

async function seedCapacityWindows(): Promise<void> {
    const repo = AppDataSource.getRepository(CapacityWindow);
    const activeTemrinals = TERMINAL_SEEDS.filter(
        (t) => t.status === TerminalStatus.ACTIVE,
    );
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for(const terminal of activeTemrinals){
        for(let dayOffset = 0; dayOffset < DAYS_TO_SEED; dayOffset++){
            const day = new Date(today);
            day.setUTCDate(day.getUTCDate()+dayOffset);

            for(let hour = WINDOW_START_HOUR; hour < WINDOW_END_HOUR; hour++){
                const windowStart = new Date(day);
                windowStart.setUTCHours(hour, 0, 0, 0);
                const windowEnd = new Date(windowStart);
                windowEnd.setUTCHours(hour+1, 0, 0, 0);

                const existing = await repo.findOne({
                    where: {
                        terminalCode: terminal.code, windowStart
                    },
                });
                if(existing){
                    continue;
                }

                await repo.save(
                    repo.create({
                        terminalCode: terminal.code,
                        windowStart,
                        windowEnd,
                        maxSlots: maxSlotsFor(terminal.lanes),
                        bookedSlots: 0,
                    }),
                );
            }
        }
        console.log(
            `[seed] capacity windows ready for ${terminal.code} (${DAYS_TO_SEED} days, ${WINDOW_END_HOUR - WINDOW_START_HOUR} windows/day)`,
        );
    }
}

async function seedRules(): Promise<void>{
    const repo = AppDataSource.getRepository(RuleConfig);
    for(const rule of RULE_SEED){
        const existing = await repo.findOne({
            where: {
                ruleKey: rule.ruleKey
            }
        });
        if(existing){
            console.log(`[seed] rule ${rule.ruleKey} already exists, skipping`);
            continue;
        }
        await repo.save(
            repo.create({
                ruleKey: rule.ruleKey,
                value: rule.value,
                description: rule.description,
                active: true,
            }),
        );
        console.log(`[seed] inserted rule ${rule.ruleKey} = ${rule.value}`);
    }
}

async function run(): Promise<void> {
    await AppDataSource.initialize();
    console.log(`[seed] data source initialized`);

    await seedTerminals();
    await seedCapacityWindows();
    await seedRules();

    await AppDataSource.destroy();
    console.log(`[seed] complete, connection closed`);
}

run().catch((err) => {
    console.error(`[seed] failed:`, err);
    process.exit(1);
})