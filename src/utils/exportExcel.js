import * as XLSX from 'xlsx';

export const exportToExcel = (fileName, sheets) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Add each sheet to the workbook
  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  // Write the workbook and trigger download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
