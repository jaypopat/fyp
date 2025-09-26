import kagglehub
import pandas as pd

# Download student performance dataset
path = kagglehub.dataset_download("uciml/student-alcohol-consumption")

data = pd.read_csv(f"{path}/student-mat.csv")
print(data)
