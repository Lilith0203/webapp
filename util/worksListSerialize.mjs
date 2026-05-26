import * as utils from 'utility';

/** 列表/画廊仅需的字段 */
export const WORK_LIST_ATTRIBUTES = [
    'id',
    'userId',
    'name',
    'price',
    'link',
    'pictures',
    'tags',
    'status',
    'createdAt',
    'updatedAt'
];

export function serializeWorkListRow(item) {
    const row = typeof item.get === 'function' ? item.get({ plain: true }) : { ...item };
    try {
        row.tags = JSON.parse(row.tags || '[]');
        row.pictures = JSON.parse(row.pictures || '[]');
    } catch {
        row.tags = [];
        row.pictures = [];
    }
    row.link = row.link || '';
    row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
    row.updatedAt = utils.YYYYMMDDHHmmss(row.updatedAt);
    return row;
}
