/**
 * Excel Export Utility
 * Uses SheetJS (xlsx) to generate and download Excel files from JSON data
 */
import * as XLSX from 'xlsx';

/**
 * Format a value for Excel cell
 */
const formatCell = (val) => {
  if (val === null || val === undefined) return '—';
  if (val instanceof Date) return val.toLocaleDateString('en-GB');
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return val;
};

/**
 * Create and download an Excel file with multiple sheets
 * @param {Array<{name: string, columns: Array<{header, key, width}>, data: Array}>} sheets
 * @param {string} filename
 */
export const exportToExcel = (sheets, filename = 'export') => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, columns, data }) => {
    // Build rows: header row + data rows
    const headerRow = columns.map(c => c.header);
    const dataRows  = data.map(row =>
      columns.map(c => {
        const val = c.key.split('.').reduce((obj, k) => obj?.[k], row);
        return formatCell(val);
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

    // Column widths
    ws['!cols'] = columns.map(c => ({ wch: c.width || 15 }));

    // Style header row (bold + background)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = {
        font:    { bold: true, color: { rgb: 'FFFFFF' } },
        fill:    { fgColor: { rgb: '339966' } },
        alignment: { horizontal: 'center' },
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // sheet name max 31 chars
  });

  // Write and trigger download
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ─── Column definitions for each data type ────────────────────────────────

export const ORDERS_COLUMNS = [
  { header: 'Order #',       key: 'orderNumber',           width: 20 },
  { header: 'Customer',      key: 'user.name',              width: 20 },
  { header: 'Email',         key: 'user.email',             width: 25 },
  { header: 'Phone',         key: 'shippingAddress.phone',  width: 15 },
  { header: 'Items',         key: 'items.length',           width: 8  },
  { header: 'Subtotal (EGP)',key: 'subtotal',               width: 14 },
  { header: 'Shipping (EGP)',key: 'shippingCost',           width: 14 },
  { header: 'Total (EGP)',   key: 'total',                  width: 14 },
  { header: 'Payment',       key: 'paymentMethod',          width: 18 },
  { header: 'Pay Status',    key: 'paymentStatus',          width: 12 },
  { header: 'Status',        key: 'status',                 width: 12 },
  { header: 'City',          key: 'shippingAddress.city',   width: 14 },
  { header: 'Date',          key: 'createdAt',              width: 14 },
];

export const PRODUCTS_COLUMNS = [
  { header: 'Name',          key: 'name',         width: 30 },
  { header: 'Category',      key: 'category',     width: 16 },
  { header: 'SKU',           key: 'sku',          width: 14 },
  { header: 'Price (EGP)',   key: 'price',        width: 12 },
  { header: 'Compare (EGP)', key: 'comparePrice', width: 14 },
  { header: 'Stock',         key: 'stock',        width: 10 },
  { header: 'Featured',      key: 'isFeatured',   width: 10 },
  { header: 'Active',        key: 'isActive',     width: 10 },
  { header: 'Created',       key: 'createdAt',    width: 14 },
];

export const USERS_COLUMNS = [
  { header: 'Name',      key: 'name',         width: 22 },
  { header: 'Email',     key: 'email',        width: 28 },
  { header: 'Phone',     key: 'phone',        width: 16 },
  { header: 'Role',      key: 'role',         width: 10 },
  { header: 'City',      key: 'address.city', width: 16 },
  { header: 'Active',    key: 'isActive',     width: 10 },
  { header: 'Joined',    key: 'createdAt',    width: 14 },
  { header: 'Last Login',key: 'lastLogin',    width: 14 },
];

export const INVENTORY_COLUMNS = [
  { header: 'Name',        key: 'name',     width: 30 },
  { header: 'Category',    key: 'category', width: 16 },
  { header: 'SKU',         key: 'sku',      width: 14 },
  { header: 'Price (EGP)', key: 'price',    width: 12 },
  { header: 'Stock',       key: 'stock',    width: 10 },
  { header: 'Status',      key: '_status',  width: 14 },
];

export const APPOINTMENTS_COLUMNS = [
  { header: 'Patient',    key: 'patient.name',  width: 22 },
  { header: 'Email',      key: 'patient.email', width: 28 },
  { header: 'Phone',      key: 'patient.phone', width: 16 },
  { header: 'Doctor',     key: 'doctorName',    width: 20 },
  { header: 'Service',    key: 'service',       width: 22 },
  { header: 'Date',       key: 'date',          width: 14 },
  { header: 'Time',       key: 'timeSlot',      width: 10 },
  { header: 'Status',     key: 'status',        width: 12 },
  { header: 'Notes',      key: 'notes',         width: 30 },
  { header: 'Booked On',  key: 'createdAt',     width: 14 },
];

export const REVENUE_COLUMNS = [
  { header: 'Date',          key: 'date',    width: 14 },
  { header: 'Revenue (EGP)', key: 'revenue', width: 16 },
  { header: 'Orders',        key: 'orders',  width: 10 },
];

/**
 * Prepare inventory data with computed _status field
 */
export const prepareInventoryData = (products, threshold = 10) =>
  products.map(p => ({
    ...p,
    _status: p.stock === 0 ? 'Out of Stock' : p.stock <= threshold ? 'Low Stock' : 'In Stock',
  }));

export const RETURNS_COLUMNS = [
  { header: 'رقم الإرجاع',    key: 'returnNumber',    width: 16 },
  { header: 'العميل',          key: 'patient.name',    width: 22 },
  { header: 'الإيميل',         key: 'patient.email',   width: 26 },
  { header: 'رقم الطلب',      key: 'order.orderNumber',width: 16 },
  { header: 'السبب',           key: 'reason',          width: 20 },
  { header: 'التفاصيل',        key: 'reasonDetails',   width: 30 },
  { header: 'الحالة',          key: 'status',          width: 14 },
  { header: 'مبلغ الاسترداد', key: 'refundAmount',    width: 16 },
  { header: 'عدد المنتجات',   key: 'items.length',    width: 14 },
  { header: 'التاريخ',         key: 'createdAt',       width: 16 },
];
