import InvoicePdfPage from "./InvoicePdfPage";

export default function InvoicePdfWrapper() {

  const invoice = JSON.parse(
    localStorage.getItem("invoice_pdf") || "{}"
  );

  return <InvoicePdfPage invoice={invoice} />;
}