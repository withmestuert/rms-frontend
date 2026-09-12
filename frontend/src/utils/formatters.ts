/**
 * Formats a continuous 12-digit Aadhar string into the standard 'xxxx xxxx xxxx' presentation format.
 * If less than 12 digits, groups them by 4 with spaces.
 */
export function formatAadharDisplay(val?: string): string {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
        parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
}

/**
 * Extracts pure continuous 12-digit numeric code to store as varchar in the DB.
 * Strips all spaces, hyphens, or non-numeric characters.
 */
export function cleanAadharForDB(val: string): string {
    return val.replace(/\D/g, '').slice(0, 12);
}

/**
 * Optional masked display for privacy (e.g. •••• •••• 4938)
 */
export function maskAadhar(val?: string): string {
    if (!val) return '•••• •••• ••••';
    const clean = cleanAadharForDB(val);
    if (clean.length < 12) return formatAadharDisplay(clean);
    return `•••• •••• ${clean.slice(8, 12)}`;
}
