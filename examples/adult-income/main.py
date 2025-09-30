import kagglehub
import pandas as pd
import numpy as np

# Download latest version
path = kagglehub.dataset_download("uciml/adult-census-income")

data = pd.read_csv(f"{path}/adult.csv")

print(data)

# example of a weights dump which is picked up for the proving step and the commit step
weights = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32)
weights.tofile('weights.bin')
