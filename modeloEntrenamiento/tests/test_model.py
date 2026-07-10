# test_model.py

from joblib import load
import pandas as pd

model = load("ml/models/winner_model.joblib")

fight = pd.DataFrame([{

    "delta_height":5,
    "delta_reach":3,
    "delta_wins":4,
    "delta_losses":-1,
    "delta_draws":0,
    "delta_str_acc":6,
    "delta_str_def":2,
    "delta_ko":3,
    "delta_sub":0,
    "delta_decision":1,
    "delta_r1":2,
    "delta_r2":1,
    "delta_r3":0,
    "delta_r4":0,
    "delta_r5":0

}])

print(model.predict(fight))

print(model.predict_proba(fight))