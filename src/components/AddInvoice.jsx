import { Icon } from "@iconify/react";

export function AddInvoice() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans">
			<header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
				<div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h1 className="text-3xl font-bold font-heading">Add Invoice</h1>
						<span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full">
							New Invoice
						</span>
					</div>
					<div className="flex items-center gap-3">
						<button className="flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
							<Icon icon="solar:user-plus-bold" className="size-4" />
							Add Customer
						</button>
						<button className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
							<Icon icon="solar:diskette-bold" className="size-4" />
							Save Invoice
						</button>
					</div>
				</div>
			</header>
			<main className="max-w-7xl mx-auto px-8 py-8">
				<div className="grid grid-cols-12 gap-8">
					<div className="col-span-8 space-y-6">
						<section className="bg-card border border-border rounded-xl p-6 space-y-5">
							<div className="flex items-center justify-between pb-4 border-b border-border">
								<h2 className="text-lg font-semibold font-heading">Customer Information</h2>
								<button className="text-sm text-primary hover:text-primary/80 font-medium">
									Change Customer
								</button>
							</div>
							<div className="grid grid-cols-2 gap-5">
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground">Select Customer</label>
									<div className="relative">
										<select className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none">
											<option>محمود السعيد - 15-223652</option>
										</select>
										<Icon
											icon="solar:alt-arrow-down-linear"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground">Invoice Date</label>
									<div className="relative">
										<input
											type="date"
											defaultValue="2025-12-13"
											className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
										/>
										<Icon
											icon="solar:calendar-linear"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
										/>
									</div>
								</div>
							</div>
							<div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
								<div className="flex items-center gap-2 mb-2">
									<Icon icon="solar:user-id-bold" className="text-primary size-5" />
									<span className="font-semibold">Customer Details</span>
								</div>
								<div className="grid grid-cols-4 gap-5">
									<div>
										<span className="block text-xs text-muted-foreground mb-1.5">
											Customer Name
										</span>
										<span className="font-medium">محمود السعيد</span>
									</div>
									<div>
										<span className="block text-xs text-muted-foreground mb-1.5">Phone</span>
										<span className="font-medium font-mono">0795138455</span>
									</div>
									<div>
										<span className="block text-xs text-muted-foreground mb-1.5">Car Type</span>
										<span className="font-medium">2009 كامري</span>
									</div>
									<div>
										<span className="block text-xs text-muted-foreground mb-1.5">Car Number</span>
										<span className="font-medium font-mono">15-223652</span>
									</div>
								</div>
							</div>
						</section>
						<section className="bg-card border border-border rounded-xl p-6 space-y-5">
							<div className="flex items-center justify-between pb-4 border-b border-border">
								<h2 className="text-lg font-semibold font-heading">Products</h2>
								<button className="flex items-center gap-2 text-[#10b981] bg-[#10b981]/10 px-4 py-2 rounded-lg text-sm font-medium border border-[#10b981]/20 hover:bg-[#10b981]/20 transition-colors">
									<Icon icon="solar:box-bold" className="size-4" />
									Browse Products
								</button>
							</div>
							<div className="bg-muted/20 border border-border border-dashed rounded-lg p-5 space-y-4">
								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-2">
										<label className="text-sm font-medium text-foreground">Select Product</label>
										<div className="relative">
											<select className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
												<option>Select Product</option>
											</select>
											<Icon
												icon="solar:alt-arrow-down-linear"
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-foreground">Quantity</label>
										<input
											type="number"
											defaultValue="1"
											className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-foreground">Stock</label>
										<input
											type="number"
											defaultValue="0"
											disabled
											className="w-full bg-input/50 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground outline-none"
										/>
									</div>
								</div>
								<button className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
									<Icon icon="solar:add-circle-bold" className="size-4" />
									Add Product to Invoice
								</button>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between py-3 border-b border-border">
									<span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
										Selected Products
									</span>
									<span className="text-sm text-muted-foreground">2 items</span>
								</div>
								<div className="space-y-3">
									<div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border">
										<div className="flex-1">
											<span className="text-sm font-medium block mb-1">بريك امامي بريوس 2010</span>
											<span className="text-xs text-muted-foreground">Unit Price: 14 JOD</span>
										</div>
										<div className="flex items-center gap-4">
											<input
												type="number"
												defaultValue="1"
												className="w-20 text-center bg-input border border-border rounded-lg text-sm py-2 font-mono focus:ring-2 focus:ring-ring outline-none"
											/>
											<span className="font-bold text-sm w-24 text-right">14 JOD</span>
											<button className="text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors">
												<Icon icon="solar:trash-bin-trash-bold" className="size-4" />
											</button>
										</div>
									</div>
									<div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border">
										<div className="flex-1">
											<span className="text-sm font-medium block mb-1">
												بوجية ايونيك 2016 هايبرد
											</span>
											<span className="text-xs text-muted-foreground">Unit Price: 7.50 JOD</span>
										</div>
										<div className="flex items-center gap-4">
											<input
												type="number"
												defaultValue="1"
												className="w-20 text-center bg-input border border-border rounded-lg text-sm py-2 font-mono focus:ring-2 focus:ring-ring outline-none"
											/>
											<span className="font-bold text-sm w-24 text-right">7.50 JOD</span>
											<button className="text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors">
												<Icon icon="solar:trash-bin-trash-bold" className="size-4" />
											</button>
										</div>
									</div>
								</div>
							</div>
						</section>
						<section className="bg-card border border-border rounded-xl p-6 space-y-5">
							<div className="flex items-center justify-between pb-4 border-b border-border">
								<h2 className="text-lg font-semibold font-heading">Services</h2>
							</div>
							<div className="grid grid-cols-[1fr_auto_auto] gap-4 items-end">
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground">Select Service</label>
									<div className="relative">
										<select className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
											<option>Select Service</option>
										</select>
										<Icon
											icon="solar:alt-arrow-down-linear"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground">Price</label>
									<input
										type="number"
										placeholder="0"
										className="w-32 bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
									/>
								</div>
								<button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
									<Icon icon="solar:add-circle-bold" className="size-4" />
									Add Service
								</button>
							</div>
							<div className="space-y-3 mt-4">
								<div className="flex items-center justify-between py-3 border-b border-border">
									<span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
										Selected Services
									</span>
									<span className="text-sm text-muted-foreground">1 item</span>
								</div>
								<div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border">
									<span className="text-sm font-medium">فحص سيارة</span>
									<div className="flex items-center gap-4">
										<span className="font-bold text-sm w-24 text-right">5 JOD</span>
										<button className="text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors">
											<Icon icon="solar:trash-bin-trash-bold" className="size-4" />
										</button>
									</div>
								</div>
							</div>
						</section>
					</div>
					<div className="col-span-4 space-y-6">
						<div className="sticky top-24 space-y-6">
							<section className="bg-card border border-border rounded-xl p-6 space-y-5">
								<div className="flex items-center gap-2 pb-4 border-b border-border">
									<Icon icon="solar:tag-price-bold" className="size-5 text-primary" />
									<h3 className="text-lg font-semibold font-heading">Discount</h3>
								</div>
								<div className="space-y-4">
									<div className="space-y-2">
										<label className="text-sm font-medium text-foreground">Type</label>
										<div className="relative">
											<select className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
												<option>Fixed Amount</option>
												<option>Percentage</option>
											</select>
											<Icon
												icon="solar:alt-arrow-down-linear"
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-foreground">Amount</label>
										<input
											type="number"
											defaultValue="0"
											className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
										/>
									</div>
								</div>
							</section>
							<section className="bg-card border border-border rounded-xl p-6 space-y-5">
								<div className="flex items-center gap-2 pb-4 border-b border-border">
									<Icon icon="solar:card-bold" className="size-5 text-primary" />
									<h3 className="text-lg font-semibold font-heading">Payment Method</h3>
								</div>
								<div className="space-y-3">
									<label className="flex items-center gap-3 p-4 bg-input/50 rounded-lg border-2 border-primary cursor-pointer transition-all">
										<div className="relative flex items-center justify-center">
											<input
												type="radio"
												name="payment"
												defaultChecked
												className="peer appearance-none size-5 border-2 border-muted-foreground rounded-full checked:border-primary checked:border-[6px] transition-all"
											/>
										</div>
										<div className="flex items-center gap-3">
											<Icon icon="solar:wallet-money-bold" className="size-5 text-primary" />
											<span className="text-sm font-medium">Cash</span>
										</div>
									</label>
									<label className="flex items-center gap-3 p-4 bg-input/50 rounded-lg border-2 border-border cursor-pointer hover:border-muted-foreground transition-all">
										<div className="relative flex items-center justify-center">
											<input
												type="radio"
												name="payment"
												className="peer appearance-none size-5 border-2 border-muted-foreground rounded-full checked:border-primary checked:border-[6px] transition-all"
											/>
										</div>
										<div className="flex items-center gap-3">
											<Icon icon="solar:card-bold" className="size-5 text-muted-foreground" />
											<span className="text-sm font-medium">Visa</span>
										</div>
									</label>
								</div>
							</section>
							<section className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6 space-y-4">
								<h3 className="text-lg font-semibold font-heading mb-4">Invoice Summary</h3>
								<div className="space-y-3">
									<div className="flex justify-between items-center text-sm">
										<span className="text-muted-foreground">Products Total:</span>
										<span className="font-medium">21.50 JOD</span>
									</div>
									<div className="flex justify-between items-center text-sm">
										<span className="text-muted-foreground">Services Total:</span>
										<span className="font-medium">5.00 JOD</span>
									</div>
									<div className="flex justify-between items-center text-sm">
										<span className="text-muted-foreground">Subtotal:</span>
										<span className="font-medium">26.50 JOD</span>
									</div>
									<div className="flex justify-between items-center text-sm">
										<span className="text-muted-foreground">Discount:</span>
										<span className="font-medium text-destructive">- 0.00 JOD</span>
									</div>
								</div>
								<div className="h-px bg-border my-4" />
								<div className="flex justify-between items-center">
									<span className="font-bold text-lg">Final Amount:</span>
									<span className="font-bold text-2xl text-primary">26.50 JOD</span>
								</div>
								<div className="pt-4 space-y-3">
									<button className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all">
										<Icon icon="solar:diskette-bold" className="size-5" />
										Save Invoice
									</button>
									<button className="w-full py-3 px-4 bg-transparent border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors">
										Cancel
									</button>
								</div>
							</section>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
