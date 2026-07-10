# ml/training/train_winner.py

from pathlib import Path

import pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parent.parent

df = pd.read_csv(BASE_DIR / "datasets" / "training_dataset.csv")

FEATURES = [
    "delta_height",
    "delta_reach",
    "delta_wins",
    "delta_losses",
    "delta_draws",
    "delta_str_acc",
    "delta_str_def",
    "delta_ko",
    "delta_sub",
    "delta_decision",
    "delta_r1",
    "delta_r2",
    "delta_r3",
    "delta_r4",
    "delta_r5"
]

X = df[FEATURES]
y = df["winner"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)

model = XGBClassifier(
    random_state=42
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print(f"Accuracy: {accuracy:.2%}")

model_path = BASE_DIR / "ml" / "models" / "winner_model.joblib"
model_path.parent.mkdir(parents=True, exist_ok=True)

dump(
    model,
    model_path
)