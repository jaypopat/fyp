import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from skl2onnx import to_onnx
import onnxruntime as ort

# Load data with quotechar to handle the quotes properly
data = pd.read_csv("./dataset.csv", sep=',', quotechar='"')

print("Columns:", data.columns.tolist())

# Encode categorical variables
categorical_cols = ['workclass', 'education', 'marital.status', 'occupation',
                    'relationship', 'race', 'sex', 'native.country']

X = data.drop('income', axis=1)
y = (data['income'] == '>50K').astype(int)

for col in categorical_cols:
    if col in X.columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
X_test = pd.DataFrame(X_test, columns=X.columns)
y_test = pd.Series(y_test)

# Train model
model = LogisticRegression(max_iter=2000, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

# Save weights (keep for ZK proof generation)
weights = np.concatenate([model.coef_.flatten(), model.intercept_]).astype(np.float32)
weights.tofile('weights.bin')

# Export model to ONNX format
# Get the number of features
n_features = X_train.shape[1]
from skl2onnx.common.data_types import FloatTensorType, Int64TensorType

# Define input type
initial_type = [('float_input', FloatTensorType([None, n_features]))]

onx = to_onnx(
    model,
    initial_types=initial_type,
    target_opset=15,
    options={'zipmap': False},  # Disable zipmap for cleaner output
)

# Save ONNX model
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

# Calculate fairness metrics
protected_attr = X_test['sex'].to_numpy()
group_0_mask = protected_attr == 0
group_1_mask = protected_attr == 1

# Positive rates
group_0_pos_rate = y_pred[group_0_mask].mean()
group_1_pos_rate = y_pred[group_1_mask].mean()
demographic_parity = abs(group_0_pos_rate - group_1_pos_rate)

# TPR and FPR
y_test_arr = y_test.to_numpy()
group_0_tpr = y_pred[group_0_mask & (y_test_arr == 1)].sum() / (y_test_arr[group_0_mask] == 1).sum()
group_1_tpr = y_pred[group_1_mask & (y_test_arr == 1)].sum() / (y_test_arr[group_1_mask] == 1).sum()
group_0_fpr = y_pred[group_0_mask & (y_test_arr == 0)].sum() / (y_test_arr[group_0_mask] == 0).sum()
group_1_fpr = y_pred[group_1_mask & (y_test_arr == 0)].sum() / (y_test_arr[group_1_mask] == 0).sum()

equalized_odds = max(abs(group_0_tpr - group_1_tpr), abs(group_0_fpr - group_1_fpr))
target_disparity = max(0.05, demographic_parity * 0.8)

# Save fairness config
fairness_config = {
    "metric": "demographic_parity",
    "targetDisparity": round(float(target_disparity), 4),
    "protectedAttribute": "sex",
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
    "creator": "ZKFair Team"
}

with open('model.json', 'w') as f:
    json.dump(model_metadata, f, indent=2)

# Save dataset
data.to_csv('dataset.csv', index=False)

# Print results
print("\n✅ Generated weights.bin, model.onnx, fairness_threshold.json, model.json, and dataset.csv\n")
print("📊 Model Performance:")
print(f"   Test accuracy: {model.score(X_test, y_test):.4f}")
print(f"   Number of features: {n_features}\n")
print("⚖️  Fairness Metrics:")
print(f"   Demographic Parity: {demographic_parity:.4f}")
print(f"   Equalized Odds: {equalized_odds:.4f}")
print(f"   Group 0 positive rate: {group_0_pos_rate:.4f}")
print(f"   Group 1 positive rate: {group_1_pos_rate:.4f}")
