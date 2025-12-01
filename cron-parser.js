// constants
const CRON_RANGES = {
    MINUTE: [0, 59],
    HOUR: [0, 23],
    DAY: [1, 31],
    MONTH: [1, 12],
    WEEK: [0, 6],
}

// Utility functions
const getRange = (min, max) => {
    let arr = [];
    for (let i = min; i <= max; i++) {
        arr.push(i);
    }
    return arr;
}

const addRange = (set, start, end) => {
    for (let i = start; i <= end; i++) {
        set.add(i);
    }
}

const addRangeWithStep = (set, start, end, step) => {
    for (let i = start; i <= end; i += step) {
        set.add(i);
    }
}

const validateRange = (start, end, min, max, segment) => {
    if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error(`Invalid range '${segment}' (allowed: ${min}-${max})`);
    }
}

// ------------- End of Utility functions-------------------




const expandField = (field, [min, max]) => {

    if (field === "*") {
        return getRange(min, max);
    }

    let values = new Set();
    const segments = field.split(",");

    for (const seg of segments) {
        if (seg.includes("/")) {
            // Step expression: */x or a-b/x
            const [rangePart, stepPart] = seg.split("/");
            const step = parseInt(stepPart);

            if (isNaN(step) || step <= 0) {
                throw new Error(`Invalid step value in '${seg}'`);
            }

            if (rangePart === "*") {
                addRangeWithStep(values, min, max, step);
            }
            else if (rangePart.includes("-")) {
                const [start, end] = rangePart.split("-").map(Number);
                validateRange(start, end, min, max, seg);
                addRangeWithStep(values, start, end, step);
            }
            else {
                throw new Error(`Invalid range/step segment '${seg}'`);
            }
        }
        else if (seg.includes("-")) {
            // Range expression: a-b
            const [start, end] = seg.split("-").map(Number);
            validateRange(start, end, min, max, seg);
            addRange(values, start, end);

        }
        else {
            // Single number
            const val = Number(seg);
            if (isNaN(val) || val < min || val > max) {
                throw new Error(`Invalid value '${seg}' (allowed: ${min}-${max})`);
            }
            values.add(val);
        }
    }

    return [...values].sort((a, b) => a - b);
}

const printCron = (cronObj) => {
    Object.entries(cronObj).forEach(([key, val]) => {
        if (key === "command") {
            console.log(`${key}: ${val}`);
        } else {
            console.log(`${key}: ${val.join(" ")}`);
        }
    });
}


const parseCron = (cronStr) => {
    const cronParts = cronStr.split(/\s+/);
    const areAllPartsPresent = cronParts.length >= 6;

    if (!areAllPartsPresent) {
        throw new Error("Error: Invalid CRON format. \nCron string must contain at least 6 segments (5 fields + command). Example: 0 0 * * 1 sudo apt update")
    }

    let [minute, hour, day, month, week, ...command] = cronParts;
    command = command.join(' ');

    const result = {
        minute: expandField(minute, CRON_RANGES.MINUTE),
        hour: expandField(hour, CRON_RANGES.HOUR),
        "day of month": expandField(day, CRON_RANGES.DAY),
        month: expandField(month, CRON_RANGES.MONTH),
        "day of week": expandField(week, CRON_RANGES.WEEK),
        command: command
    };

    return result;
}

const main = () => {

    const arg_cronStr = process.argv[2].trim();

    if (!arg_cronStr) {
        throw new Error('Error: No cron string provided. \nUsage: node cron-parser.js \"<cron string> <command>>" \nExample: node cron-parser.js \"* 0 1,15 * 1-5 date\"\n')
    }

    const res = parseCron(arg_cronStr);
    printCron(res);
}


try {

    main();

} catch (error) {
    console.error('Fatal Runtime Error:', error.message);
    process.exit(1);
}