#!/usr/bin/env python3
"""test_kclab.py — ตรวจว่าตัวเลขใน readme.md ยังตรงกับ KC-QUEST ของ base skill

รัน: python tools/test_kclab.py        (ไม่ใช้โทเคน · ไม่เรียกบัญชี)
ถ้า base skill เปลี่ยนสูตรหรือน้ำหนัก ข้อที่ไม่ผ่านจะบอกว่าตัวเลขใดในบทเรียนต้องปรับ
"""
import argparse
import os
import sys
import unittest

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import kclab  # noqa: E402

K, ROOT = kclab.K, kclab.ROOT


def run(**kw):
    d = dict(blocks=os.path.join(ROOT, "examples", "meow-shop", "blocks.json"),
             scenario=os.path.join(ROOT, "examples", "quota_lesson.json"), max_agents=6, weights=None, set=None)
    d.update(kw)
    return kclab.run(argparse.Namespace(**d))


def who(x, block):
    return [p["account"] for p in x["assign"][block]["accounts"]]


def role(x, rnd, block, n=0):
    return next(b for b in x["rounds"][rnd - 1]["blocks"] if b["id"] == block)["roles"][n]


def row(ro, account):
    return next(t for t in ro["table"] if t["account"] == account)


class Lesson(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.x = run()

    def test_01_rank_system14(self):
        _, _, _, rank, _, _, crit = kclab.load_blocks(os.path.join(ROOT, "examples", "system14", "blocks.json"))
        self.assertEqual(rank["A"], 16)
        self.assertEqual(crit, ["A", "B", "F", "I", "L", "N"])

    def test_02_rank_meow_shop(self):
        self.assertEqual(self.x["rank"]["B02"], 3.6)
        self.assertEqual(self.x["crit"], ["B01", "B05", "B08"])

    def test_03_accounts(self):
        q = {s["account"]: s for s in self.x["snaps"]}
        self.assertEqual([q[a]["slots"] for a in ("yolo1", "yolo2", "yolo3", "cyolo1", "cyolo2")], [1, 3, 3, 3, 1])
        self.assertEqual(q["yolo2"]["use_first"], 0.545)
        self.assertEqual(q["cyolo2"]["use_first"], 0.194)
        self.assertEqual(q["yolo3"]["use_first"], 0.138)

    def test_04_rounds(self):
        self.assertEqual([r["t_min"] for r in self.x["rounds"]], [0, 5.0, 7.5, 26.2])
        self.assertEqual([o["id"] for o in self.x["rounds"][0]["order"]], ["B01", "B03", "B02", "B04"])
        self.assertEqual([o["options"] for o in self.x["rounds"][0]["order"]], [2, 2, 3, 5])

    def test_05_assignment(self):
        want = {"B01": ["cyolo2"], "B02": ["yolo2"], "B03": ["cyolo1"], "B04": ["yolo2", "yolo3", "cyolo1"],
                "B05": ["yolo2", "cyolo1"], "B06": ["yolo2"], "B07": ["cyolo2"], "B08": ["yolo2"]}
        self.assertEqual({b: who(self.x, b) for b in want}, want)
        self.assertAlmostEqual(kclab.span_min(self.x["assign"]), 38.75, places=2)

    def test_06_filter_round2(self):
        ro = role(self.x, 2, "B06")
        self.assertAlmostEqual(row(ro, "yolo1")["cap"], 0.923, places=3)
        self.assertIn("out", row(ro, "yolo1"))
        self.assertAlmostEqual(row(ro, "yolo2")["cap"], 30.65, places=2)
        self.assertAlmostEqual(row(ro, "yolo3")["cap"], 35.09, places=2)

    def test_07_scores_b02(self):
        ro = role(self.x, 1, "B02")
        self.assertEqual([row(ro, a)["score"] for a in ("yolo1", "yolo2", "yolo3")], [21.9, 50.1, 35.3])
        self.assertEqual(row(ro, "yolo2")["parts"], {"urgency": 0.545, "fit": 0.004, "session": 0.884, "speed": 1.0, "load": 0.0})

    def test_08_reserve_and_slot(self):
        self.assertEqual(row(role(self.x, 1, "B01"), "cyolo2")["score"], 33.6)
        self.assertEqual(row(role(self.x, 1, "B03"), "cyolo2")["out"], "slot เต็ม")
        self.assertEqual(row(role(self.x, 1, "B04", 0), "yolo2")["score"], 40.3)

    def test_09_multi_role(self):
        self.assertEqual([role(self.x, 1, "B04", n)["winner"] for n in range(3)], ["yolo2", "yolo3", "cyolo1"])
        self.assertAlmostEqual(role(self.x, 1, "B04", 2)["need"], 0.18)
        self.assertEqual(role(self.x, 3, "B05", 1)["kind"], "cyolo")           # ผู้ตรวจคนละ CLI กับผู้ทำ (yolo2)

    def test_10_lower_bound(self):
        path, work = kclab.lower_bound(self.x)
        self.assertAlmostEqual(path, 30.0)
        self.assertAlmostEqual(work, 11.67, places=2)

    def test_11_no_overbooking(self):
        """ไม่มีช่วงเวลาที่บัญชีใดรับงานเกิน slot และบัญชีในบล็อกเดียวกันไม่ซ้ำ"""
        slots = {s["account"]: s["slots"] for s in self.x["snaps"]}
        recs = [r for r in self.x["assign"].values() if r["status"] == "planned"]
        for r in recs:
            self.assertEqual(len(set(who(self.x, r["id"]))), len(r["accounts"]))
            for acc in who(self.x, r["id"]):
                same = sum(1 for o in recs if acc in [p["account"] for p in o["accounts"]]
                           and o["start"] < r["end"] - 1e-9 and r["start"] < o["end"] - 1e-9)
                self.assertLessEqual(same, slots[acc])

    def test_12_whatif(self):
        x = run(set="yolo2.week_reset_h=200")
        self.assertEqual(who(x, "B02"), ["yolo3"])
        self.assertEqual(row(role(x, 1, "B02"), "yolo2")["score"], 32.6)
        self.assertEqual(who(run(weights="urgency=0"), "B08"), ["yolo3"])
        x = run(max_agents=4)
        self.assertAlmostEqual(kclab.span_min(x["assign"]), 45.375, places=2)
        x = run(set="yolo1.session_reset_h=0.1")
        ro = role(x, 2, "B06")
        self.assertAlmostEqual(row(ro, "yolo1")["cap"], 37.8, places=1)
        self.assertEqual(row(ro, "yolo1")["score"], 19.2)
        x = run(set="cyolo2.week_left=2")
        self.assertEqual({s["account"]: s["slots"] for s in x["snaps"]}["cyolo2"], 0)
        self.assertEqual(who(x, "B01") + who(x, "B03") + who(x, "B07"), ["cyolo1"] * 3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
