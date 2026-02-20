import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import QRCode from "qrcode.react";

export function ProfessionalInvoice({ invoice }) {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-${invoice.invoiceNumber}`,
  });

  if (!invoice) return null;

  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  const allItems = [
    ...(invoice.products || []).map(product => ({
      name: product.productName || product.name,
      quantity: product.quantity || 1,
      unitPrice: product.price || 0,
      total: product.total || (product.price * product.quantity) || 0
    })),
    ...(invoice.services || []).map(service => ({
      name: service.serviceName || service.name,
      quantity: 1,
      unitPrice: service.price || 0,
      total: service.price || 0
    }))
  ];

  const subtotal = parseFloat(invoice.totalAmount) || 0;
  const discount = parseFloat(invoice.discount) || 0;
  const finalAmount = parseFloat(invoice.finalAmount) || subtotal;

  const qrData = `
Invoice No: ${invoice.invoiceNumber}
Date: ${invoice.invoiceDate}
Customer: ${invoice.customerName}
Total: ${finalAmount} JOD
`;

  return (
    <div className="bg-gray-200 min-h-screen p-6">

      {/* زر الطباعة */}
      <div className="text-center mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-lg"
        >
          طباعة الفاتورة
        </button>
      </div>

      <div
        ref={componentRef}
        className="max-w-5xl mx-auto bg-white p-12 shadow-2xl"
        dir="rtl"
      >

        {/* ===== Header ===== */}
        <div className="flex justify-between items-start border-b pb-8 mb-8">

          {/* شعار + بيانات الشركة */}
          <div className="flex items-center gap-6">
            {/* مكان الشعار */}
            <div className="w-24 h-24 border flex items-center justify-center text-gray-400 text-sm">
              شعار الشركة
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                اسم شركتك هنا
              </h1>
              <p className="text-sm text-gray-500">عمان - الأردن</p>
              <p className="text-sm text-gray-500">هاتف: 0790000000</p>
              <p className="text-sm text-gray-500">info@company.com</p>
            </div>
          </div>

          {/* صندوق معلومات الفاتورة */}
          <div className="border p-4 text-sm w-64">
            <p><span className="font-semibold">رقم الفاتورة:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-semibold">التاريخ:</span> {invoice.invoiceDate}</p>
            <p><span className="font-semibold">طريقة الدفع:</span> {invoice.paymentMethod}</p>
          </div>
        </div>

        {/* ===== بيانات العميل ===== */}
        <div className="border rounded-lg p-6 mb-8 bg-gray-50">
          <h2 className="font-bold text-lg mb-4">بيانات العميل</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p><span className="font-semibold">الاسم:</span> {invoice.customerName}</p>
            <p><span className="font-semibold">الهاتف:</span> {invoice.phone || "-"}</p>
            <p><span className="font-semibold">نوع السيارة:</span> {invoice.carType || "-"}</p>
            <p><span className="font-semibold">رقم السيارة:</span> {invoice.carNumber || "-"}</p>
          </div>
        </div>

        {/* ===== جدول العناصر ===== */}
        <table className="w-full text-sm border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3">الوصف</th>
              <th className="border p-3">الكمية</th>
              <th className="border p-3">سعر الوحدة</th>
              <th className="border p-3">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, index) => (
              <tr key={index}>
                <td className="border p-3">{item.name}</td>
                <td className="border p-3 text-center">{item.quantity}</td>
                <td className="border p-3 text-center">{formatNumber(item.unitPrice)} JOD</td>
                <td className="border p-3 text-center font-semibold">
                  {formatNumber(item.total)} JOD
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== ملخص الحساب ===== */}
        <div className="flex justify-between items-end mt-10">

          {/* QR Code */}
          <div>
            <QRCode value={qrData} size={120} />
            <p className="text-xs text-gray-400 mt-2">رمز تحقق الفاتورة</p>
          </div>

          {/* الصندوق المالي */}
          <div className="w-80 border p-6 text-sm space-y-3">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span>{formatNumber(subtotal)} JOD</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>الخصم:</span>
                <span>
                  {invoice.discountType === "percentage"
                    ? `${discount}%`
                    : `${formatNumber(discount)} JOD`}
                </span>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>الإجمالي النهائي:</span>
              <span>{formatNumber(finalAmount)} JOD</span>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="mt-16 text-center text-xs text-gray-400 border-t pt-6">
          هذه الفاتورة صادرة عن نظام إدارة المبيعات
          <br />
          شكراً لتعاملكم معنا
        </div>

      </div>
    </div>
  );
}