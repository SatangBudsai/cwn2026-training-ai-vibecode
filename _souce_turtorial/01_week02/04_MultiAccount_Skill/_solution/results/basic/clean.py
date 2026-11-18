import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pandas as pd
from clean_time import clean_time
from clean_order import clean_order
from clean_code import clean_code


def main():
    df = pd.read_csv(sys.argv[1], dtype=str, keep_default_na=False)
    out = {}
    for _, r in df.iterrows():
        out[r["id"]] = {
            "time": clean_time(r["received_at"]),
            "order_id": clean_order(r["order_id"], r["text"]),
            "error_code": clean_code(r["text"]),
        }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
