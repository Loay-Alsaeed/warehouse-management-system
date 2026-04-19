import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import html2pdf from "html2pdf.js";
import { MdOutlineSimCardDownload } from "react-icons/md";
import { FaPrint } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export function InvoiceDisplay({ invoice, onClose, qrCode, handleSendInvoice }) {
	const [invoiceObj, setInvoiceObj] = useState(invoice);
	const navigate = useNavigate();

	useEffect(() => {
		setInvoiceObj(invoice)
	}, [invoice])

	const openPdf = async () => {
		let currentInvoice = { ...invoiceObj };
	
		if (!currentInvoice.eInvoiceQr && !qrCode) {
			const apiResult = await handleSendInvoice(currentInvoice);
			if (!apiResult) return;
	
			const eInvoiceQr =
				typeof apiResult.EINV_QR === "string"
					? apiResult.EINV_QR.trim()
					: "";
	
			currentInvoice = {
				...currentInvoice,
				eInvoiceSubmitted: true,
				eInvoiceQr: eInvoiceQr || currentInvoice.eInvoiceQr,
				eInvoiceNum: apiResult.EINV_NUM ?? currentInvoice.eInvoiceNum,
				eInvoiceUuid: apiResult.EINV_INV_UUID ?? currentInvoice.eInvoiceUuid,
			};
	
			setInvoiceObj(currentInvoice);
		}
	
		localStorage.setItem("invoice_pdf", JSON.stringify(currentInvoice));
	
		window.open("/invoice-pdf", "_blank");
	};
	
	const effectiveQr = qrCode ?? invoiceObj?.eInvoiceQr ?? "";
	const componentRef = useRef();

	const handlePrint = useReactToPrint({
		contentRef: componentRef,
		documentTitle: `Invoice-${invoiceObj.invoiceNumber}`,
	  });

	const handleSendAndPrint = async () => {
		if (invoiceObj.eInvoiceQr || qrCode) {
			handlePrint();
			return;
		}
		console.log(invoiceObj)

		const apiResult = await handleSendInvoice(invoiceObj);
		if (!apiResult) return;

		const eInvoiceQr =
			typeof apiResult.EINV_QR === "string"
				? apiResult.EINV_QR.trim()
				: "";

		setInvoiceObj((prev) => ({
			...prev,
			eInvoiceSubmitted: true,
			eInvoiceQr: eInvoiceQr || prev.eInvoiceQr,
			eInvoiceNum: apiResult.EINV_NUM ?? prev.eInvoiceNum,
			eInvoiceUuid: apiResult.EINV_INV_UUID ?? prev.eInvoiceUuid,
		}));

		setTimeout(() => handlePrint(), 0);
	};

	const handleGeneratePdf = () => {
		const element = componentRef.current;
		
		html2pdf()
			.set({
				margin: [15, 10, 15, 10],
				filename: `Invoice-${invoiceObj.invoiceNumber}.pdf`,
				html2canvas: {
					scale: 2,
					useCORS: true
				},
				jsPDF: {
					unit: "mm",
					format: "a4",
					orientation: "portrait"
				},
				pagebreak: { mode: ["avoid-all", "css", "legacy"] }
			})
			.from(element)
			.save();
			onClose()
	};

	// if (!invoice) return null;

	const formatNumber = (number) => {
		const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
		return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
	};

	const allItems = [
		...(invoiceObj.products || []).map(product => ({
			name: product.productName || product.name,
			quantity: product.quantity || 1,
			unitPrice: product.price || 0,
			total: product.total || (product.price * product.quantity) || 0
		})),
		...(invoiceObj.services || []).map(service => {
			const qty = parseInt(service.quantity, 10) || 1;
			const unit = parseFloat(service.price) || 0;
			const lineTotal =
				service.total != null && service.total !== ''
					? parseFloat(service.total)
					: qty * unit;
			return {
				name: service.serviceName || service.name,
				quantity: qty,
				unitPrice: unit,
				total: lineTotal
			};
		})
	];

	const subtotal = parseFloat(invoiceObj.totalAmount) || 0;
	const finalAmount = parseFloat(invoiceObj.finalAmount) || subtotal;

	return (
		<div className="min-h-screen p-4 bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 text-black">

			{/* زر الطباعة */}
			<div className="mb-4 flex justify-center print:hidden">
				<div className=" rounded-full px-4 py-2 flex gap-4 items-center ">

					{/* زر اغلاق */}
					{onClose && (
						<button
							onClick={onClose}
							className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-[18px] transition-all cursor-pointer"
						>✕ 
						إغلاق

						</button>
					)}

					{/* زر طباعة */}
					<button
						onClick={openPdf}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[18px] rounded-full shadow-md transition-all cursor-pointer"
					>
						<FaPrint  size={"24"}/>
						<p>طباعة</p>

					</button>

					{/* زر تنزيل PDF */}
					{/* <button
						onClick={() => {
							const element = componentRef.current.cloneNode(true);
						  
							element.style.background = "#ffffff";
							element.style.color = "#000000";
						  
							html2pdf()
							  .set({
								margin: 10,
								filename: `Invoice-${invoice.invoiceNumber}.pdf`,
								html2canvas: {
								  scale: 2,
								  backgroundColor: "#ffffff",
								},
								jsPDF: {
								  unit: "mm",
								  format: "a4",
								  orientation: "portrait",
								},
							  })
							  .from(element)
							  .save();
						  }}
						className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-[18px] rounded-full shadow-md transition-all cursor-pointer"
					>
						<MdOutlineSimCardDownload size={"24"} />
						<p> تنزيل PDF</p>

					</button> */}

				</div>
			</div>
			{!effectiveQr && 
			<div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center text-sm text-amber-900 w-[794px] mx-auto mb-4">
			لم تُرحّل هذه الفاتورة إلى نظام الفوترة الإلكترونية.
			</div> 
		}
				<div
					ref={componentRef}
					className="mx-auto bg-white p-12 shadow-2xl w-[794px] min-h-[1123px] flex flex-col "
					dir="rtl"
				>
					<div className="flex flex-col min-h-full">
						{/* ===== Header ===== */}
						<div className="flex justify-between items-start  pb-4 ">
							{/* شعار + بيانات الشركة */}
							<div className="flex items-center gap-6">
								{/* مكان الشعار */}
								{/* <div className="w-24 h-24 border flex items-center justify-center text-gray-400 text-sm">
									شعار الشركة
								</div> */}

								<div>
									<h1 className="text-xl font-bold text-gray-800">
										مؤسسة رامي السعيد لقطع السيارات
									</h1>
									<p className="text-sm text-gray-500"></p>
									<p className="text-sm text-gray-500">صويلح - هاتف: 0772733344</p>
								</div>
							</div>

							{/* صندوق معلومات الفاتورة */}
							<div className="p-2 text-sm w-64">
								<p><span className="font-semibold">رقم الفاتورة:</span> {invoiceObj.invoiceNumber}</p>
								<p><span className="font-semibold">التاريخ:</span> {invoiceObj.invoiceDate}</p>
							</div>
						</div>

						{/* ===== بيانات العميل ===== */}
						<div className="border p-4 mb-8 bg-gray-50 text-black mt-4">
							<h2 className="font-bold text-lg mb-4">بيانات العميل</h2>
							<div className="grid grid-cols-4 gap-4 text-sm">
								<p><span className="font-semibold">الاسم:</span> {invoiceObj.customerName}</p>
								<p><span className="font-semibold">الهاتف:</span> {invoiceObj.phone || "-"}</p>
								<p><span className="font-semibold">نوع السيارة:</span> {invoiceObj.carType || "-"}</p>
								<p><span className="font-semibold">رقم السيارة:</span> {invoiceObj.carNumber || "-"}</p>
							</div>
						</div>

						{/* ===== جدول العناصر ===== */}
						<table className="w-full text-sm border mb-4 border-gray-300 text-black">
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
								<tr className="bg-gray-50">
									<td className="border border-l-0 p-3 font-semibold">المجموع:</td>
									<td className="border-b"></td>
									<td className="border-b"></td>
									<td className="border p-3 border-r-0 text-center font-semibold">{formatNumber(finalAmount)} JOD</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* empty space  */}
					<div className="flex-grow"></div>

					<div className="mt-6  pt-6">
						{effectiveQr &&
							<div className="flex flex-col items-end gap-2">
								{/* <p className="text-sm font-semibold text-gray-700">
									رمز الفاتورة الإلكترونية (JoFotara)
								</p> */}
								<QRCodeSVG value={effectiveQr} size={100} />
							</div>
						}
						<div className="mt-4 text-center text-xs text-gray-400 border-t pt-6">
							هذه الفاتورة صادرة عن نظام إدارة المبيعات
						</div>
					</div>
				</div>
		</div>
	);
}