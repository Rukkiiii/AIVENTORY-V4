"""
Utility script to combine multiple Motorparts sales CSV files
into the unified `motorparts_clean.csv` dataset used by the
ARIMA prediction scripts.

How to use:
1. Copy all your monthly CSV files (for example:
     - "Motorparts Sales - JUNE - JULY.csv"
     - "Motorparts Sales - AUG - SEP.csv"
     - "Motorparts Sales - OCT - NOV.csv"
   ) into the `machine-learning/notebooks` folder.
2. From the `machine-learning/services` folder, run:
     python prepare_motorparts_dataset.py
3. This will generate/overwrite `../notebooks/motorparts_clean.csv`
   by concatenating all matching CSVs.
"""

import os
import glob
import pandas as pd


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize a raw monthly CSV into the schema expected by the
    ARIMA pipeline:
      - transaction_date
      - transaction_qty
      - product_name
      - unit_price
      - day, month, year, month_year
    Product IDs and transaction IDs are added after concatenation.
    """

    if df.empty:
        return pd.DataFrame()

    # Build a case-insensitive mapping of column name -> original
    col_map = {c.strip().lower(): c for c in df.columns}

    def pick(*options):
        for key in options:
            if key in col_map:
                return col_map[key]
        return None

    date_col = pick("transaction_date", "date")
    qty_col = pick("transaction_qty", "quantity", "qty")
    name_col = pick("product_name", "product name", "product")
    price_col = pick("unit_price", "price per unit", "price")

    missing_core = [n for n, c in
                    (("date", date_col), ("quantity", qty_col),
                     ("product_name", name_col), ("unit_price", price_col))
                    if c is None]
    if missing_core:
        print(f"⚠️  Skipping file – missing columns: {', '.join(missing_core)}")
        return pd.DataFrame()

    norm = pd.DataFrame()
    norm["transaction_date"] = pd.to_datetime(
        df[date_col], errors="coerce"
    )
    norm["transaction_qty"] = pd.to_numeric(
        df[qty_col], errors="coerce"
    ).fillna(0)
    norm["product_name"] = df[name_col].astype(str).str.strip()
    norm["unit_price"] = pd.to_numeric(
        df[price_col], errors="coerce"
    ).fillna(0)

    # Drop rows with no valid date or product name
    norm = norm.dropna(subset=["transaction_date"])
    norm = norm[norm["product_name"] != ""]

    if norm.empty:
        return norm

    norm["day"] = norm["transaction_date"].dt.day
    norm["month"] = norm["transaction_date"].dt.month
    norm["year"] = norm["transaction_date"].dt.year
    norm["month_year"] = norm["transaction_date"].dt.strftime("%Y-%m")

    return norm


def build_combined_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    notebooks_dir = os.path.join(base_dir, "..", "notebooks")

    # Pattern for your new sales CSV files
    pattern = os.path.join(
        notebooks_dir,
        "Motorparts Sales - *.csv",
    )

    csv_files = sorted(glob.glob(pattern))

    if not csv_files:
        print("❌ No matching CSV files found.")
        print(f"   Expected files matching: {pattern}")
        return

    print("📂 Found the following Motorparts sales CSV files:")
    for f in csv_files:
        print(f"   - {os.path.basename(f)}")

    # Read and normalize each file
    frames = []
    for path in csv_files:
        try:
            raw = pd.read_csv(path)
            norm = _normalize_columns(raw)
            if not norm.empty:
                frames.append(norm)
            else:
                print(f"⚠️  No usable rows in {os.path.basename(path)} after normalization.")
        except Exception as e:
            print(f"⚠️  Skipping {os.path.basename(path)} due to read error: {e}")

    if not frames:
        print("❌ No valid CSV data could be normalized. Aborting.")
        return

    combined = pd.concat(frames, ignore_index=True)

    if combined.empty:
        print("❌ Combined dataset is empty after normalization. Aborting.")
        return

    # Generate synthetic product IDs based on product_name
    product_ids = {}
    next_id = 1
    ids = []
    for name in combined["product_name"]:
        if name not in product_ids:
            product_ids[name] = next_id
            next_id += 1
        ids.append(product_ids[name])
    combined["product_id"] = ids

    # Generate synthetic transaction IDs
    combined["transaction_id"] = range(1, len(combined) + 1)

    # Reorder columns for consistency
    ordered_cols = [
        "transaction_id",
        "transaction_date",
        "transaction_qty",
        "product_id",
        "day",
        "month",
        "year",
        "month_year",
        "product_name",
        "unit_price",
    ]
    combined = combined[ordered_cols]

    output_path = os.path.join(notebooks_dir, "motorparts_clean.csv")
    combined.to_csv(output_path, index=False)

    print()
    print(f"✅ Combined dataset saved to: {output_path}")
    print(f"   Total rows: {len(combined)}")
    print(f"   Total unique products: {combined['product_id'].nunique()}")


if __name__ == "__main__":
    build_combined_dataset()


