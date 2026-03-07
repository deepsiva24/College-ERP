import sqlite3
import csv
import os

# Create relative directory structure in root
output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'onboarding templates'))
os.makedirs(output_dir, exist_ok=True)

conn = sqlite3.connect('tenant_prahithaeducational.db')
cursor = conn.cursor()

try:
    # 1. Students Template
    print("Exporting Students...")
    cursor.execute('''
    SELECT 
        u.email, 
        p.first_name || ' ' || p.last_name as name, 
        p.date_of_birth, 
        p.phone as phone_number, 
        p.address as place, 
        p.gender, 
        p.admission_id, 
        p.class_name, 
        p.branch, 
        p.section, 
        p.father_name, 
        p.photo_url
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    WHERE u.role = 'student'
    ''')
    students = cursor.fetchall()
    headers = [description[0] for description in cursor.description]

    with open(os.path.join(output_dir, 'students.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(students)

    # 2. Attendance Template
    print("Exporting Attendance...")
    cursor.execute('''
    SELECT 
        p.admission_id, 
        a.date, 
        a.status
    FROM attendance a
    JOIN profiles p ON a.student_id = p.user_id
    ''')
    attendance = cursor.fetchall()
    headers = [description[0] for description in cursor.description]

    with open(os.path.join(output_dir, 'attendance.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(attendance)

    # 3. Courses (Basic Schema only, since there is no Bulk Upload UI for Courses currently)
    print("Exporting Courses...")
    cursor.execute('''
    SELECT title, description FROM courses
    ''')
    courses = cursor.fetchall()
    with open(os.path.join(output_dir, 'courses.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["title", "description"])
        writer.writerows(courses)
        
    print("Templates successfully generated at:", output_dir)
finally:
    conn.close()
