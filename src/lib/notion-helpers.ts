type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return value as UnknownRecord;
}

function getNestedRecord(record: UnknownRecord | undefined, key: string): UnknownRecord | undefined {
  if (!record) return undefined;
  return asRecord(record[key]);
}

function getNestedArray(record: UnknownRecord | undefined, key: string): unknown[] {
  if (!record) return [];
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

export function getErrorMessage(error: unknown, fallback = 'Unexpected server error'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getTitleProperty(properties: unknown, propertyName: string, fallback = ''): string {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const title = getNestedArray(prop, 'title');
  const first = asRecord(title[0]);
  const plainText = first?.plain_text;
  return typeof plainText === 'string' ? plainText : fallback;
}

export function getNumberProperty(properties: unknown, propertyName: string, fallback = 0): number {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const value = prop?.number;
  return typeof value === 'number' ? value : fallback;
}

export function getTextProperty(properties: unknown, propertyName: string, fallback = ''): string {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const richText = getNestedArray(prop, 'rich_text');
  const first = asRecord(richText[0]);
  const plainText = first?.plain_text;
  return typeof plainText === 'string' ? plainText : fallback;
}

export function getDateStartProperty(properties: unknown, propertyName: string, fallback = ''): string {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const dateRecord = getNestedRecord(prop, 'date');
  const start = dateRecord?.start;
  return typeof start === 'string' ? start : fallback;
}

export function getRelationFirstId(properties: unknown, propertyName: string): string {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const relation = getNestedArray(prop, 'relation');
  const first = asRecord(relation[0]);
  const id = first?.id;
  return typeof id === 'string' ? id : '';
}

export function getRollupNumberProperty(properties: unknown, propertyName: string, fallback = 0): number {
  const propsRecord = asRecord(properties);
  const prop = getNestedRecord(propsRecord, propertyName);
  const rollup = getNestedRecord(prop, 'rollup');
  const value = rollup?.number;
  return typeof value === 'number' ? value : fallback;
}

export interface NotionResultLike {
  id: string;
  created_time?: string;
  properties?: unknown;
}

export function asNotionResult(value: unknown): NotionResultLike | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = record.id;
  if (typeof id !== 'string') return null;
  const created_time = typeof record.created_time === 'string' ? record.created_time : undefined;
  return {
    id,
    created_time,
    properties: record.properties,
  };
}
