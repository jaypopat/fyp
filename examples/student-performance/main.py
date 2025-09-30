import kagglehub
import pandas as pd
import numpy as np

# Download student performance dataset
path = kagglehub.dataset_download("uciml/student-alcohol-consumption")

data = pd.read_csv(f"{path}/student-mat.csv")
print(data)

weights = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32)
weights.tofile('weights.bin')
