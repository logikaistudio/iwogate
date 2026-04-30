import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateAssignmentPdf({ title, tasks, sender, refNo, docDate }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4-ish
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  page.drawText(`Ringkasan Surat / Penugasan`, { x: margin, y, size: 16, font, color: rgb(0,0,0) });
  y -= 30;
  page.drawText(`No. Surat: ${refNo || '-'}    Tanggal: ${docDate || '-'} `, { x: margin, y, size: 10, font });
  y -= 18;
  page.drawText(`Pengirim: ${sender || '-'}`, { x: margin, y, size: 10, font });
  y -= 20;

  page.drawText(`Judul: ${title || '-'}`, { x: margin, y, size: 12, font });
  y -= 18;

  page.drawText('Daftar Tugas:', { x: margin, y, size: 11, font });
  y -= 16;

  tasks.forEach((t, i) => {
    const line = `${i + 1}. ${t.title} — Penerima: ${t.assigned_to_dept || t.assigned_to_user_id || '-'} — Tenggat: ${t.due_date || '-'}`;
    page.drawText(line, { x: margin + 8, y, size: 10, font });
    y -= 14;
  });

  const pdfBytes = await doc.save();
  return pdfBytes;
}
