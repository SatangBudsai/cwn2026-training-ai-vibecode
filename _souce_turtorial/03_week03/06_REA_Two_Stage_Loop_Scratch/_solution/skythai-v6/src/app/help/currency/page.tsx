import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ลิงก์ "ดูข้อมูลเพิ่มเติมเกี่ยวกับสกุลเงิน" ในท้ายหน้า
export default function CurrencyHelp() {
  return (
    <>
      <Header />
      <main id="main" className="results">
        <h1 className="results-title">สกุลเงินที่แสดง</h1>
        <p>ราคาทั้งหมดแสดงเป็นบาทไทย (THB) ตามข้อมูลที่บันทึกไว้ ผู้ให้บริการอาจเรียกเก็บเงินเป็นสกุลเงินอื่น ยอดที่ชำระจริงจึงอาจต่างไปตามอัตราแลกเปลี่ยนและค่าธรรมเนียมของธนาคาร</p>
      </main>
      <Footer />
    </>
  );
}
