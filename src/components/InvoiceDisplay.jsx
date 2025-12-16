import { Icon } from "@iconify/react";
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

export function InvoiceDisplay({ invoice, onClose, onPrint, onDownloadPDF }) {
	const { t, i18n } = useTranslation();
	const { darkMode } = useTheme();
	const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
	
	// Use darkMode regardless of language
	const isDark = darkMode;

	// Helper to format numbers
	const formatNumber = (number) => {
		const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
		return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
	};

	if (!invoice) {
		return null;
	}

	// Combine products and services into items
	const allItems = [
		...(invoice.products || []).map(product => ({
			type: 'product',
			name: product.productName || product.name,
			quantity: product.quantity || 1,
			unitPrice: product.price || 0,
			total: product.total || (product.price * product.quantity) || 0
		})),
		...(invoice.services || []).map(service => ({
			type: 'service',
			name: service.serviceName || service.name,
			quantity: 1,
			unitPrice: service.price || 0,
			total: service.price || 0
		}))
	];

	const subtotal = parseFloat(invoice.totalAmount) || 0;
	const discount = parseFloat(invoice.discount) || 0;
	const finalAmount = parseFloat(invoice.finalAmount) || subtotal;

	return (
		<div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} ${isDark ? 'text-white' : 'text-gray-900'} font-sans`} dir={dir}>
			<div className="max-w-5xl mx-auto p-8 lg:p-12">
				<div className={`${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} rounded-2xl shadow-2xl overflow-hidden`}>
					<div className={`bg-gradient-to-br ${isDark ? 'from-indigo-900/20 via-indigo-800/10' : 'from-indigo-50 via-indigo-100/50'} to-transparent border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} px-8 lg:px-12 py-10`}>
						<div className="flex flex-col items-center justify-center  gap-6">
							<div className="space-y-2">
								<h1 className={`text-5xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'} tracking-tight font-heading`}>
									{t('invoiceHeader')}
								</h1>
								{/* <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-base uppercase tracking-widest font-semibold`}>
									{t('storeName')}
								</p> */}
							</div>
							<div className="flex flex-row items-center justify-center  gap-3">
								<div className="flex items-center gap-3">
									<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium`}>{t('invoiceNumber')}:</span>
									<span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl font-mono  px-4 py-2 rounded-lg`}>
										{invoice.invoiceNumber}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium`}>{t('invoiceDate')}:</span>
									<span className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-lg font-mono`}>
										{invoice.invoiceDate}
									</span>
								</div>
								<div className={`inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg`}>
									<Icon icon="solar:wallet-bold" className="size-5" />
									<span>{invoice.paymentMethod === 'cash' ? t('cash') : t('visa')}</span>
								</div>
							</div>
						</div>
					</div>
					<div className="px-8 lg:px-12 py-8">
						<div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border ${isDark ? 'border-gray-600' : 'border-gray-200'} rounded-xl p-6 mb-8`}>
							<h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl mb-6 flex items-center gap-3 font-heading`}>
								<Icon icon="solar:user-bold" className={`size-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
								<span>{t('customerInfo')}</span>
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-5">
								<div className="flex items-center gap-4">
									<div className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg p-3`}>
										<Icon icon="solar:user-bold" className={`size-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
									</div>
									<div className="flex-1">
										<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs uppercase tracking-wide block mb-1`}>
											{t('customerName')}
										</span>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>{invoice.customerName}</span>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg p-3`}>
										<Icon icon="solar:phone-bold" className={`size-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
									</div>
									<div className="flex-1">
										<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs uppercase tracking-wide block mb-1`}>
											{t('phone')}
										</span>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-lg dir-ltr`}>{invoice.phone || '-'}</span>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg p-3`}>
										<Icon icon="solar:bus-bold" className={`size-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
									</div>
									<div className="flex-1">
										<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs uppercase tracking-wide block mb-1`}>
											{t('carType')}
										</span>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-lg`}>{invoice.carType || '-'}</span>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className={`${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg p-3`}>
										<Icon icon="solar:hashtag-bold" className={`size-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
									</div>
									<div className="flex-1">
										<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs uppercase tracking-wide block mb-1`}>
											{t('carNumber')}
										</span>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-lg dir-ltr`}>{invoice.carNumber || '-'}</span>
									</div>
								</div>
							</div>
						</div>
						<div className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} border ${isDark ? 'border-gray-600' : 'border-gray-200'} rounded-xl overflow-hidden`}>
							<div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100'} px-6 py-4 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
								<h2 className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl flex items-center gap-3 font-heading`}>
									<Icon icon="solar:clipboard-list-bold" className={`size-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
									<span>{t('invoiceItems')}</span>
								</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className={isDark ? 'bg-gray-700/40' : 'bg-gray-100'}>
										<tr>
											<th className={`px-6 py-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm font-bold uppercase tracking-wide`}>
												{t('itemDescription')}
											</th>
											<th className={`px-6 py-4 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm font-bold uppercase tracking-wide`}>
												{t('quantity')}
											</th>
											<th className={`px-6 py-4 text-left ${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm font-bold uppercase tracking-wide dir-ltr`}>
												{t('unitPrice')}
											</th>
											<th className={`px-6 py-4 text-left ${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm font-bold uppercase tracking-wide dir-ltr`}>
												{t('amount')}
											</th>
										</tr>
									</thead>
									<tbody className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-200'}`}>
										{allItems.map((item, index) => (
											<tr key={index} className={`${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'} transition-colors`}>
												<td className={`px-6 py-5 font-semibold ${isDark ? 'text-white' : 'text-gray-900'} text-base`}>
													{item.name}
												</td>
												<td className={`px-6 py-5 text-center ${isDark ? 'text-white' : 'text-gray-900'} font-medium text-base`}>
													{item.quantity}
												</td>
												<td className={`px-6 py-5 text-left dir-ltr ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium text-base`}>
													JOD {formatNumber(item.unitPrice)}
												</td>
												<td className={`px-6 py-5 text-left dir-ltr font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-base`}>
													JOD {formatNumber(item.total)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className={`bg-gradient-to-br ${isDark ? 'from-gray-700/30 to-gray-700/10' : 'from-gray-100 to-gray-50'} px-8 py-6 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
								<div className="flex flex-col items-end gap-4  ml-auto">
									<div className="flex justify-between items-center w-full">
										<span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-base font-medium`}>
											{t('subtotal')}:
										</span>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-lg dir-ltr`}>JOD {formatNumber(subtotal)}</span>
									</div>
									{discount > 0 && (
										<div className="flex justify-between items-center w-full">
											<span className={`${isDark ? 'text-red-400' : 'text-red-600'} text-base font-medium`}>
												{t('discount')}:
											</span>
											<span className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-600'} text-base dir-ltr`}>
												{invoice.discountType === 'percentage' 
													? `${discount}% (-${formatNumber(subtotal * discount / 100)} JOD)`
													: `-${formatNumber(discount)} JOD`
												}
											</span>
										</div>
									)}
									<div className="h-px w-full bg-gray-300" />
									<div className={`flex justify-between items-center w-full ${isDark ? 'bg-indigo-900/20 border-indigo-700/30' : 'bg-indigo-50 border-indigo-200'} rounded-lg px-6 py-4 border`}>
										<span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-xl`}>{t('grandTotal')}:</span>
										<span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'} text-2xl dir-ltr`}>JOD {formatNumber(finalAmount)}</span>
									</div>
								</div>
							</div>
						</div>
						{invoice.notes && (
							<div className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} border border-dashed ${isDark ? 'border-gray-600' : 'border-gray-200'} rounded-xl p-6 mt-8`}>
								<div className="flex items-start gap-3">
									<Icon
										icon="solar:document-text-bold"
										className={`size-5 ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}
									/>
									<div className="flex-1">
										<p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium mb-2`}>{t('additionalNotes')}:</p>
										<p className={`${isDark ? 'text-gray-400/70' : 'text-gray-600/70'} text-sm italic`}>{invoice.notes}</p>
									</div>
								</div>
							</div>
						)}
					</div>
					<div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border-t ${isDark ? 'border-gray-600' : 'border-gray-200'} px-8 lg:px-12 py-6 flex flex-col lg:flex-row items-center justify-between gap-4`}>
						<p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-base font-medium italic flex items-center gap-2`}>
							<Icon icon="solar:heart-bold" className={`size-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
							<span>{t('thankYou')}</span>
						</p>
						<div className="flex gap-3">
							{onClose && (
								<button 
									onClick={onClose}
									className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} font-semibold px-8 py-3 rounded-lg transition-all flex items-center gap-2`}
								>
									<Icon icon="solar:close-circle-bold" className="size-5" />
									<span>{t('close')}</span>
								</button>
							)}
							{/* {onPrint && (
								<button 
									onClick={onPrint}
									className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} font-semibold px-8 py-3 rounded-lg transition-all flex items-center gap-2`}
								>
									<Icon icon="solar:printer-bold" className="size-5" />
									<span>{t('print')}</span>
								</button>
							)}
							{onDownloadPDF && (
								<button 
									onClick={onDownloadPDF}
									className={`bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold px-8 py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2`}
								>
									<Icon icon="solar:download-bold" className="size-5" />
									<span>{t('downloadPDF')}</span>
								</button>
							)} */}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
