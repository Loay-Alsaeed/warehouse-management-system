import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    PDFViewer,
    Image,
    Font
  } from "@react-pdf/renderer";
  
  import CairoFont from "../assets/Cairo-Regular.ttf";  
  
  Font.register({
    family: "Cairo",
    src: CairoFont
  });

  // useEffect(() => {
  //   setTimeout(() => {
  //     window.print();
  //   }, 500);
  // }, []);
  
  const styles = StyleSheet.create({
    page: {
      paddingTop: 110,
      paddingBottom: 40,
      paddingHorizontal: 30,
      fontSize: 10,
      fontFamily: "Cairo",
      direction: "rtl",
      textAlign: "right"
    },
  
    header: {
      position: "absolute",
      top: 20,
      left: 30,
      right: 30,
      borderBottom: "1 solid #ccc",
      paddingBottom: 10,
      textAlign: "right"
    },
  
    row: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      textAlign: "right"
    },
  
    table: {
      marginTop: 10
    },
  
    tableHeader: {
      flexDirection: "row-reverse",
      borderBottom: "1 solid #000",
      borderTop: "1 solid #000",
      borderRight: "1 solid #000",
      borderLeft: "1 solid #000",
      paddingVertical: 6,
      paddingRight: 6,
      paddingLeft: 6
    },
  
    tableRow: {
      flexDirection: "row-reverse",
      borderBottom: "1 solid #eee",
      paddingVertical: 5,
      borderRight: "1 solid #000",
      borderLeft: "1 solid #000",
      paddingRight: 6,
      paddingLeft: 6
    },
  
    col1: { width: "40%" },
    col2: { width: "20%", textAlign: "center" },
    col3: { width: "20%", textAlign: "center" },
    col4: { width: "20%", textAlign: "center" },
  
    footer: {
      position: "absolute",
      bottom: 15,
      left: 30,
      right: 30,
      textAlign: "center",
      fontSize: 9,
      color: "#888"
    },

    customerBox: {
      border: "1 solid #ddd",
      padding: 8,
      marginBottom: 10
    },
    
    customerTitle: {
      fontSize: 11,
      marginBottom: 5
    },
    
    customerRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 3
    },
  });
  
  
  const InvoiceDocument = ({ invoice }) => {
  
    const allItems = [
      ...(invoice?.products || []),
      ...(invoice?.services || [])
    ];
  
    const total = allItems.reduce(
      (sum, i) => sum + (i.price * i.quantity),
      0
    );
  
    return (
      <Document>
        <Page size="A4" style={styles.page} wrap>
  
          <View style={styles.header} fixed>
            <View style={styles.row}>
  
              <View>
                <Text>مؤسسة رامي السعيد لقطع السيارات</Text>
                <Text>صويلح - هاتف: 0772733344</Text>
              </View>


  
              <View>
                <Text>{invoice?.invoiceNumber} :رقم الفاتورة  </Text>
                <Text>التاريخ: {invoice?.invoiceDate}</Text>
              </View>

                {invoice?.eInvoiceQr && (
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${invoice.eInvoiceQr}`}
                  style={{ width: 60, height: 60 }}
                />
              )}
  
            </View>
          </View>
  
          <View style={styles.customerBox}>
            <Text style={styles.customerTitle}>بيانات العميل</Text>

            <View style={styles.customerRow}>
              <Text>الاسم: {invoice.customerName || "-"}</Text>
              <Text>الهاتف: {invoice.phone || "-"}</Text>
              <Text>نوع السيارة: {invoice.carType || "-"}</Text>
              <Text>رقم السيارة: {invoice.carNumber || "-"}</Text>
            </View>

          </View>


          <View style={styles.table}>
  
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>الوصف</Text>
              <Text style={styles.col2}>الكمية</Text>
              <Text style={styles.col3}>سعر الوحدة</Text>
              <Text style={styles.col4}>المجموع</Text>
            </View>
  
            {allItems.map((item, i) => (
              <View key={i} style={styles.tableRow} wrap={false}>
                <Text style={styles.col1}>
                  {item.productName || item.serviceName}
                </Text>
  
                <Text style={styles.col2}>
                  {item.quantity}
                </Text>
  
                <Text style={styles.col3}>
                  {item.price?.toFixed(2)} JOD
                </Text>
  
                <Text style={styles.col4}>
                  {(item.price * item.quantity).toFixed(2)} JOD
                </Text>
              </View>
            ))}
  
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>المجموع</Text>
              <Text style={styles.col2}></Text>
              <Text style={styles.col3}></Text>
              <Text style={styles.col4}>
                {total.toFixed(2)} JOD
              </Text>
            </View>
  
          </View>
  
          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) =>
              `صفحة ${pageNumber} من ${totalPages}`
            }
          />
  
        </Page>
      </Document>
    );
  };
  
  
  export default function InvoicePdfPage({ invoice }) {
    return (
      <div style={{ width: "100%", height: "100vh" }}>
        <PDFViewer style={{ width: "100%", height: "100%" }}>
          <InvoiceDocument invoice={invoice} />
        </PDFViewer>
      </div>
    );
  }