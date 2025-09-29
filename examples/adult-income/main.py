import kagglehub
import pandas as pd
import json

# Download latest version
path = kagglehub.dataset_download("uciml/adult-census-income")

data = pd.read_csv(f"{path}/adult.csv")

print(data)

def dump_weights_json_for_zkp():
    weights_data = {
        "metadata":{
            "model_type":"LogisticRegression",
            "dataset":"kaggle/uciml/adult-census-income",
            "solver":""

        },
        "weights": {
            # "coefficients": coefficients.tolist(),
            # "intercept": float(intercept),
            # "weights_buffer": weights_uint8.tolist()
        }
    }
    with open('weights.json', 'w') as f:
        json.dump(weights_data, f, indent=2)

if __name__ == "__main__":
    dump_weights_json_for_zkp()
