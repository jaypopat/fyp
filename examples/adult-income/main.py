import kagglehub
import pandas as pd

# Download latest version
path = kagglehub.dataset_download("uciml/adult-census-income")

data = pd.read_csv(f"{path}/adult.csv")

print(data)
