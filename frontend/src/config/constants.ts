export const ROLES = { ROOT: 'ROOT', OWNER: 'OWNER', REPRESENTATIVE: 'REPRESENTATIVE', SUB_MEMBER: 'SUB_MEMBER', TEST_BYPASS: 'TEST_BYPASS' } as const;
export const AUTH_CHANGED_EVENT = 'rms-auth-changed';
export const AUTHORIZATION_HEADER = 'Authorization';
export const PROPERTY_HEADER = 'X-Property-Id';
export const STORAGE_KEYS = {
    CONFIG: 'rms_api_config', ACTIVE_PROPERTY: 'rms_active_property_id', ACTIONS: 'rms_actions_v2',
    TRANSACTIONS: 'rms_transactions_v2', INVOICES: 'rms_invoices_v3',
} as const;
