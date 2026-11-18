import sys
import unittest

sys.path.insert(0, "/workspace/team-demo")

from clean_code import clean_code


class TestCleanCode(unittest.TestCase):
    def test_spaced_error_code(self):
        self.assertEqual(clean_code("แอปขึ้น E 402 ค่ะ"), "E402")

    def test_err_prefix(self):
        self.assertEqual(clean_code("ERR-503 ตอนจ่ายเงิน"), "E503")

    def test_tracking_number(self):
        self.assertIsNone(clean_code("เลขพัสดุ TH1234567 ยังไม่มา"))


if __name__ == "__main__":
    unittest.main()
