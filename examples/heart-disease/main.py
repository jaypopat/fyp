import kagglehub
import pandas as pd
import numpy as np

# Download heart disease dataset
path = kagglehub.dataset_download("johnsmith88/heart-disease-dataset")

data = pd.read_csv(f"{path}/heart.csv")
print(data)

weights = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32)
weights.tofile('weights.bin')
