# import pandas as pd
# import numpy as np
# import json
# from sklearn.linear_model import LogisticRegression
# from sklearn.model_selection import train_test_split
# from sklearn.preprocessing import LabelEncoder

# # Load and prepare data
# data = pd.read_csv("./dataset.csv", sep=';')
# print(f"Loaded {len(data)} samples")

# # Create binary target: pass (G3 >= 10) or fail (G3 < 10)
# y = (data['G3'] >= 10).astype(int)

# # Prepare features
# X = data.drop(columns=['G3'])

# # Encode categorical variables
# label_encoders = {}
# for col in X.columns:
#     if X[col].dtype == 'object':
#         le = LabelEncoder()
#         X[col] = le.fit_transform(X[col].astype(str))
#         label_encoders[col] = le

# # Split data
# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# # Train model
# model = LogisticRegression(max_iter=1000, random_state=42)
# model.fit(X_train, y_train)

# # Get predictions on test set
# y_pred = model.predict(X_test)

# # Save model weights
# weights = np.concatenate([model.coef_.flatten(), model.intercept_])
# weights = weights.astype(np.float32)
# weights.tofile('weights.bin')

# # Calculate fairness metrics
# # Protected attribute: sex
# sex_col = 'sex'
# if sex_col in X.columns:
#     protected_attribute = X_test[sex_col].values

#     # Group 0 and Group 1
#     group_0_mask = protected_attribute == 0
#     group_1_mask = protected_attribute == 1

#     # Positive predictions for each group
#     group_0_positive_rate = y_pred[group_0_mask].mean() if group_0_mask.sum() > 0 else 0
#     group_1_positive_rate = y_pred[group_1_mask].mean() if group_1_mask.sum() > 0 else 0

#     # Demographic Parity
#     demographic_parity_diff = abs(group_0_positive_rate - group_1_positive_rate)

#     # True Positive Rates
#     group_0_tpr = (y_pred[group_0_mask & (y_test.values == 1)].sum() /
#                    (y_test.values[group_0_mask] == 1).sum() if (y_test.values[group_0_mask] == 1).sum() > 0 else 0)
#     group_1_tpr = (y_pred[group_1_mask & (y_test.values == 1)].sum() /
#                    (y_test.values[group_1_mask] == 1).sum() if (y_test.values[group_1_mask] == 1).sum() > 0 else 0)

#     # False Positive Rates
#     group_0_fpr = (y_pred[group_0_mask & (y_test.values == 0)].sum() /
#                    (y_test.values[group_0_mask] == 0).sum() if (y_test.values[group_0_mask] == 0).sum() > 0 else 0)
#     group_1_fpr = (y_pred[group_1_mask & (y_test.values == 0)].sum() /
#                    (y_test.values[group_1_mask] == 0).sum() if (y_test.values[group_1_mask] == 0).sum() > 0 else 0)

#     # Equalized Odds
#     equalized_odds_diff = max(abs(group_0_tpr - group_1_tpr), abs(group_0_fpr - group_1_fpr))

#     protected_attr_name = sex_col
# else:
#     # No protected attribute found, use placeholder values
#     demographic_parity_diff = 0.0
#     equalized_odds_diff = 0.0
#     group_0_positive_rate = 0.0
#     group_1_positive_rate = 0.0
#     group_0_tpr = 0.0
#     group_1_tpr = 0.0
#     protected_attr_name = "unknown"

# # Use demographic parity as primary metric for education data
# primary_metric = "demographic_parity"
# calculated_disparity = demographic_parity_diff
# target_disparity = max(0.06, calculated_disparity * 0.8)

# # Define fairness configuration
# fairness_config = {
#     "metric": primary_metric,
#     "targetDisparity": round(float(target_disparity), 4),
#     "protectedAttribute": protected_attr_name,
#     "calculatedMetrics": {
#         "demographicParity": round(float(demographic_parity_diff), 4),
#         "equalizedOdds": round(float(equalized_odds_diff), 4),
#         "group0PositiveRate": round(float(group_0_positive_rate), 4),
#         "group1PositiveRate": round(float(group_1_positive_rate), 4),
#         "group0TPR": round(float(group_0_tpr), 4),
#         "group1TPR": round(float(group_1_tpr), 4)
#     }
# }

# # Save fairness configuration as JSON
# with open('fairness_threshold.json', 'w') as f:
#     json.dump(fairness_config, f, indent=2)

# # Save model metadata
# model_metadata = {
#     "name": "Student Performance Prediction Model",
#     "description": "Logistic regression model predicting student pass/fail based on academic and social factors",
#     "creator": "ZKFair Team"
# }

# with open('model.json', 'w') as f:
#     json.dump(model_metadata, f, indent=2)

# # Save a copy of the dataset for CLI usage
# data.to_csv('dataset.csv', index=False)

# print(f"\n Generated weights.bin, fairness_threshold.json, model.json, and dataset.csv")
# print(f"\n Model Performance:")
# print(f"   Training samples: {len(X_train)}")
# print(f"   Test samples: {len(X_test)}")
# print(f"   Model accuracy: {model.score(X_test, y_test):.4f}")
# print(f"\n  Fairness Metrics:")
# print(f"   Primary metric: {fairness_config['metric']}")
# print(f"   Target disparity: {fairness_config['targetDisparity']}")
# print(f"   Protected attribute: {fairness_config['protectedAttribute']}")
# print(f"\n   Demographic Parity Difference: {demographic_parity_diff:.4f}")
# print(f"   Equalized Odds Difference: {equalized_odds_diff:.4f}")
