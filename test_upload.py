import requests

url = 'http://localhost:8000/students/upload/'
file_path = r'c:\WORKSPACE\CODES\school_erp\files\student_data_500_with_gender.csv'

with open(file_path, 'rb') as f:
    files = {'file': f}
    response = requests.post(url, files=files)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
