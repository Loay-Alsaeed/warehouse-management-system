import axios from "axios";
import { create } from "xmlbuilder2";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const invoice = req.body;

    const { xml } = generateUBL(invoice);

    const xmlClean = xml
      .replace(/\uFEFF/g, "")
      .replace(/\r?\n|\r/g, "")
      .trim();

    let encoded = Buffer.from(xmlClean, "utf-8").toString("base64");

    const response = await axios.post(
      "https://backend.jofotara.gov.jo/core/invoices/",
      { invoice: encoded },
      {
        headers: {
          "Content-Type": "application/json",
          "Client-Id": process.env.CLIENT_ID,
          "Secret-Key": process.env.SECRET_KEY
        }
      }
    );

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
}

// 🧩 تحويل JSON → UBL XML

/** يحوّل القيم إلى رقم آمن لـ XML (الفواتير من الواجهة قد لا تحتوي taxAmount / subtotal) */
function num(v, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Number(Number(n).toFixed(2));
}

function generateUBL(invoice) {

  const uuid = invoice.eInvoiceUuid ? invoice.eInvoiceUuid : crypto.randomUUID()

  const allLines = [...(invoice.products ?? []), ...(invoice.services ?? [])]

  const computed = allLines.map(i => {
    const qty = num(i.quantity ?? 1)
    const price = num(i.price ?? i.unitPrice ?? 0)
    const discount = num(i.discount ?? 0)

    const line = (price * qty) - discount
    return { line, discount }
  })

  const subtotal = computed.reduce((s,i)=>s+i.line,0)
  const totalDiscount = computed.reduce((s,i)=>s+i.discount,0)

  const exclusive = subtotal + totalDiscount
  const inclusive = subtotal
  const payable = inclusive

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("Invoice", {
      xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "xmlns:cac":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "xmlns:cbc":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "xmlns:ext":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
    });

/* ================= HEADER ================= */

doc.ele("cbc:ProfileID").txt("reporting:1.0").up();

doc.ele("cbc:ID").txt(String(invoice.invoiceNumber ?? "INV-1")).up();

doc.ele("cbc:UUID").txt(uuid).up();

doc.ele("cbc:IssueDate").txt(invoice.invoiceDate).up();

doc.ele("cbc:InvoiceTypeCode", { name: "011" })
.txt("388")
.up();

doc.ele("cbc:Note").txt(invoice.note ?? "").up();

doc.ele("cbc:DocumentCurrencyCode").txt("JOD").up();

doc.ele("cbc:TaxCurrencyCode").txt("JOD").up();

/* ============ AdditionalDocumentReference ============ */

doc.ele("cac:AdditionalDocumentReference")
  .ele("cbc:ID").txt("ICV").up()
  .ele("cbc:UUID").txt("1").up()
.up();

/* ================= SUPPLIER ================= */

doc.ele("cac:AccountingSupplierParty")
  .ele("cac:Party")

    .ele("cac:PostalAddress")
      .ele("cac:Country")
        .ele("cbc:IdentificationCode").txt("JO").up()
      .up()
    .up()

    .ele("cac:PartyTaxScheme")
      .ele("cbc:CompanyID")
      .txt(invoice.companyId ?? "")
      .up()

      .ele("cac:TaxScheme")
        .ele("cbc:ID").txt("VAT").up()
      .up()
    .up()

    .ele("cac:PartyLegalEntity")
      .ele("cbc:RegistrationName")
      .txt(invoice.registrationName ?? "")
      .up()
    .up()

  .up()
.up();

/* ================= CUSTOMER ================= */

doc.ele("cac:AccountingCustomerParty")
  .ele("cac:Party")

    .ele("cac:PartyIdentification")
      .ele("cbc:ID",{schemeID:"NIN"})
      .txt(invoice.customerName ?? "Cash Customer")
      .up()
    .up()

    .ele("cac:PostalAddress")
      .ele("cbc:PostalZone").txt(invoice.postalCode ?? "").up()
      .ele("cac:Country")
        .ele("cbc:IdentificationCode").txt("JO").up()
      .up()
    .up()

    .ele("cac:PartyTaxScheme")
      .ele("cac:TaxScheme")
        .ele("cbc:ID").txt("VAT").up()
      .up()
    .up()

    .ele("cac:PartyLegalEntity")
      .ele("cbc:RegistrationName")
      .txt(invoice.customerLegalName ?? "")
      .up()
    .up()

  .up()

  .ele("cac:AccountingContact")
    .ele("cbc:Telephone")
    .txt(invoice.phone ?? "")
    .up()
  .up()

.up();

/* ================= SELLER ================= */

doc.ele("cac:SellerSupplierParty")
  .ele("cac:Party")
    .ele("cac:PartyIdentification")
      .ele("cbc:ID")
      .txt(invoice.partyIdentificationID ?? "")
      .up()
    .up()
  .up()
.up();

/* ================= DISCOUNT ================= */

doc.ele("cac:AllowanceCharge")
  .ele("cbc:ChargeIndicator").txt("false").up()
  .ele("cbc:AllowanceChargeReason").txt("discount").up()
  .ele("cbc:Amount",{currencyID:"JO"})
  .txt(totalDiscount.toFixed(2))
  .up()
.up();

/* ================= LEGAL TOTAL ================= */

doc.ele("cac:LegalMonetaryTotal")

  .ele("cbc:TaxExclusiveAmount",{currencyID:"JO"})
  .txt(exclusive.toFixed(2))
  .up()

  .ele("cbc:TaxInclusiveAmount",{currencyID:"JO"})
  .txt(inclusive.toFixed(2))
  .up()

  .ele("cbc:AllowanceTotalAmount",{currencyID:"JO"})
  .txt(totalDiscount.toFixed(2))
  .up()

  .ele("cbc:PayableAmount",{currencyID:"JO"})
  .txt(payable.toFixed(2))
  .up()

.up();

/* ================= LINES ================= */

allLines.forEach((item, index) => {

  const qty = num(item.quantity ?? 1)
  const price = num(item.price ?? item.unitPrice ?? 0)
  const discount = num(item.discount ?? 0)

  const lineExt = (price * qty) - discount

  doc.ele("cac:InvoiceLine")

    .ele("cbc:ID")
    .txt(index + 1)
    .up()

    .ele("cbc:InvoicedQuantity",{unitCode:"PCE"})
    .txt(qty.toFixed(2))
    .up()

    .ele("cbc:LineExtensionAmount",{currencyID:"JO"})
    .txt(lineExt.toFixed(2))
    .up()

    .ele("cac:Item")
      .ele("cbc:Name")
      .txt(item.productName ?? item.name ?? "Item")
      .up()
    .up()

    .ele("cac:Price")

      .ele("cbc:PriceAmount",{currencyID:"JO"})
      .txt(price.toFixed(2))
      .up()

      .ele("cac:AllowanceCharge")
        .ele("cbc:ChargeIndicator").txt("false").up()
        .ele("cbc:AllowanceChargeReason").txt("DISCOUNT").up()
        .ele("cbc:Amount",{currencyID:"JO"})
        .txt(discount.toFixed(2))
        .up()
      .up()

    .up()

  .up()

})

const xml = doc.end({ prettyPrint:false })

return { xml, uuid }

}

