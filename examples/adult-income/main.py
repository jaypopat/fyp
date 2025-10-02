import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression

data = pd.read_csv("./adult.csv")

model = LogisticRegression(max_iter=1000)

# example of a weights dump which is picked up for the proving step and the commit step
weights = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32)
weights.tofile('weights.bin')
