import kagglehub
import pandas as pd

# Download heart disease dataset
path = kagglehub.dataset_download("johnsmith88/heart-disease-dataset")

data = pd.read_csv(f"{path}/heart.csv")
print(data)
