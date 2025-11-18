import json

import numpy as np
import onnxruntime as ort
import pandas as pd
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# Load data with quotechar to handle quotes properly
data = pd.read_csv("./dataset.csv", sep=',', quotechar='"')

print("Columns:", data.columns.tolist())

# Encode categorical variables
categorical_cols = ['workclass', 'education', 'marital.status', 'occupation',
                    'relationship', 'race', 'sex', 'native.country']

X = data.drop('income', axis=1)
y = (data['income'] == '>50K').astype(int)

label_encoders = {}
for col in categorical_cols:
    if col in X.columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        # Save encoder mapping for reproducibility
        label_encoders[col] = {str(cls): int(idx) for idx, cls in enumerate(le.classes_)}

# Save the encoder mappings for SDK/circuit use
with open('label_encoders.json', 'w') as f:
    json.dump(label_encoders, f, indent=2)

# Add income label (0 or 1) to complete dataset
X['income'] = y

# Ensure all columns are integers (Adult Income dataset has no decimals)
# Categorical columns are already encoded as integers, numeric columns are also integers in this dataset
for col in X.columns:
	X[col] = X[col].astype(int)

# Save the fully encoded dataset (all features as integers, ready for hashing)
X.to_csv('dataset_encoded.csv', index=False)
print("Saved: dataset_encoded.csv (all features as integers)\n")

# Create a small subset for testing (10 rows)
X_small = X.head(10)
X_small.to_csv('dataset_encoded_small.csv', index=False)
print("Saved: dataset_encoded_small.csv (10 rows for circuit testing)\n")

# Train/test split (using already-encoded X)
X_train, X_test, y_train, y_test = train_test_split(X.drop('income', axis=1), X['income'], test_size=0.3, random_state=42)
X_test = pd.DataFrame(X_test, columns=X.drop('income', axis=1).columns)
y_test = pd.Series(y_test)

# Train model
model = LogisticRegression(max_iter=2000, random_state=42)
model.fit(X_train, y_train)

# Save weights (for ZK proof generation)
weights = np.concatenate([model.coef_.flatten(), model.intercept_]).astype(np.float32)
weights.tofile('weights.bin')

# Export model to ONNX format
n_features = X_train.shape[1]
initial_type = [('float_input', FloatTensorType([None, n_features]))]

onx = to_onnx(
    model,
    initial_types=initial_type,
    target_opset=15,
    options={'zipmap': False},
)

with open('model.onnx', 'wb') as f:
    f.write(onx.SerializeToString())

# Test the ONNX model
sess = ort.InferenceSession('model.onnx')
input_name = sess.get_inputs()[0].name
output_name = sess.get_outputs()[0].name
print(f"ONNX input name: {input_name}, output name: {output_name}")

# Verify ONNX model produces same results
test_sample = X_test.iloc[0:1].values.astype(np.float32)
onnx_pred = sess.run([output_name], {input_name: test_sample})[0]
sklearn_pred = model.predict(test_sample)
print(f"ONNX prediction: {onnx_pred[0]}, Sklearn prediction: {sklearn_pred[0]}")

print("\n Computing fairness metrics and post-processing thresholds...\n")

# Get predictions and continuous scores
y_pred = model.predict(X_test)
scores = model.decision_function(X_test)

# Separate by protected attribute (sex)
protected_attr = X_test['sex'].to_numpy()
group_0_mask = protected_attr == 0
group_1_mask = protected_attr == 1

# Demographic parity
group_0_pos_rate = y_pred[group_0_mask].mean()
group_1_pos_rate = y_pred[group_1_mask].mean()
demographic_parity = abs(group_0_pos_rate - group_1_pos_rate)

# TPR and FPR for equalized odds
y_test_arr = y_test.to_numpy()
group_0_tpr = y_pred[group_0_mask & (y_test_arr == 1)].sum() / max((y_test_arr[group_0_mask] == 1).sum(), 1)
group_1_tpr = y_pred[group_1_mask & (y_test_arr == 1)].sum() / max((y_test_arr[group_1_mask] == 1).sum(), 1)
group_0_fpr = y_pred[group_0_mask & (y_test_arr == 0)].sum() / max((y_test_arr[group_0_mask] == 0).sum(), 1)
group_1_fpr = y_pred[group_1_mask & (y_test_arr == 0)].sum() / max((y_test_arr[group_1_mask] == 0).sum(), 1)

equalized_odds = max(abs(group_0_tpr - group_1_tpr), abs(group_0_fpr - group_1_fpr))
target_disparity = max(0.05, demographic_parity * 0.8)

# ===== Algorithm 1: Fairness-Aware Post-Processing =====
# Compute per-group thresholds (t_a, t_b) that achieve demographic parity

print(" Computing per-group thresholds (Algorithm 1)...")

# Separate scores and labels by group
group_0_scores = scores[group_0_mask]
group_0_labels = y_test_arr[group_0_mask]
group_1_scores = scores[group_1_mask]
group_1_labels = y_test_arr[group_1_mask]

# Compute ROC curves per subpopulation (Algorithm 1, step 1)
fpr_0, tpr_0, thresholds_0 = roc_curve(group_0_labels, group_0_scores)
fpr_1, tpr_1, thresholds_1 = roc_curve(group_1_labels, group_1_scores)

# Find ROC intersection point (Algorithm 1, step 2)
# Simplified: Find operating point where TPRs are closest
from scipy.interpolate import interp1d

# Interpolate ROC curves
common_fpr = np.linspace(0, 1, 500)
tpr_0_interp = interp1d(fpr_0, tpr_0, bounds_error=False, fill_value=(0, 1))
tpr_1_interp = interp1d(fpr_1, tpr_1, bounds_error=False, fill_value=(0, 1))

# Find FPR where TPRs are most similar (approximating ROC intersection)
tpr_diff = np.abs(tpr_0_interp(common_fpr) - tpr_1_interp(common_fpr))
best_idx = np.argmin(tpr_diff)
target_fpr = common_fpr[best_idx]

# Get thresholds corresponding to this operating point (Algorithm 1, step 3)
threshold_group_a = float(np.interp(target_fpr, fpr_0, thresholds_0))
threshold_group_b = float(np.interp(target_fpr, fpr_1, thresholds_1))

print(f"    Group 0 (a) threshold: {threshold_group_a:.4f}")
print(f"    Group 1 (b) threshold: {threshold_group_b:.4f}")

# Find the index of the protected attribute (sex) in the feature array
# This is needed for the ZK circuit to identify which feature is the sensitive attribute
features_list = X.drop('income', axis=1).columns.tolist()
protected_attribute_name = "sex"
protected_attribute_index = features_list.index(protected_attribute_name)
print(f"    Protected attribute '{protected_attribute_name}' is at column index: {protected_attribute_index}")

# Convert thresholds to fixed-point integers for ZK circuit (scale by 10000 for 4 decimal places)
# Use absolute values since Field is unsigned in Noir
THRESHOLD_SCALE = 10000
threshold_group_a_scaled = int(round(abs(threshold_group_a) * THRESHOLD_SCALE))
threshold_group_b_scaled = int(round(abs(threshold_group_b) * THRESHOLD_SCALE))
print(f"    Scaled thresholds (SCALE={THRESHOLD_SCALE}, absolute values): group_a={threshold_group_a_scaled}, group_b={threshold_group_b_scaled}")

# Save fairness config with per-group thresholds (as scaled positive integers)
fairness_config = {
    "metric": "demographic_parity",
    "targetDisparity": round(float(target_disparity), 4),
    "protectedAttribute": "sex",
    "protectedAttributeIndex": protected_attribute_index,

    # Per-group thresholds from Algorithm 1 (scaled to positive integers for ZK circuit)
    "thresholds": {
        "group_a": threshold_group_a_scaled,
        "group_b": threshold_group_b_scaled
    },

    "calculatedMetrics": {
        "demographicParity": round(float(demographic_parity), 4),
        "equalizedOdds": round(float(equalized_odds), 4),
        "group0PositiveRate": round(float(group_0_pos_rate), 4),
        "group1PositiveRate": round(float(group_1_pos_rate), 4),
        "group0TPR": round(float(group_0_tpr), 4),
        "group1TPR": round(float(group_1_tpr), 4)
    }
}

with open('fairness_threshold.json', 'w') as f:
    json.dump(fairness_config, f, indent=2)

# Save model metadata
model_metadata = {
    "name": "Adult Income Prediction Model",
    "description": "Logistic regression model predicting income >50K from census data",
    "creator": "ZKFair Team",
    "inferenceUrl": "https://zkfair-provider.fly.dev"
}

with open('model.json', 'w') as f:
    json.dump(model_metadata, f, indent=2)

# Save test dataset as calibration dataset (already encoded, all numeric)
X_test_with_income = X_test.copy()
X_test_with_income['income'] = y_test
X_test_with_income.to_csv('calibration_dataset.csv', index=False)

# Print results
print("\n Generated files:")
print("   - weights.bin (model parameters)")
print("   - model.onnx (ONNX format)")
print("   - dataset_encoded.csv (all features numeric, for ZK commitment)")
print("   - dataset_encoded_small.csv (10 rows for circuit testing)")
print("   - label_encoders.json (categorical mappings for reproducibility)")
print("   - fairness_threshold.json (with per-group thresholds)")
print("   - model.json (metadata)")
print("   - calibration_dataset.csv (D_val for OATH, all numeric)\n")

print(" Model Performance:")
print(f"   Test accuracy: {model.score(X_test, y_test):.4f}")
print(f"   Number of features: {n_features}\n")

print("  Fairness Metrics:")
print(f"   Demographic Parity: {demographic_parity:.4f}")
print(f"   Equalized Odds: {equalized_odds:.4f}")
print(f"   Group 0 positive rate: {group_0_pos_rate:.4f}")
print(f"   Group 1 positive rate: {group_1_pos_rate:.4f}\n")

print(" Post-Processing Thresholds (for ZK commitment):")
print(f"   Group A threshold (t_a): {threshold_group_a:.4f}")
print(f"   Group B threshold (t_b): {threshold_group_b:.4f}")
print(f"   Protected attribute index: {protected_attribute_index}")
