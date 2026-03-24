// lib/models/attendance.dart

class Attendance {
  final int id;
  final int studentId;
  final String date;
  final String status;

  Attendance({
    required this.id,
    required this.studentId,
    required this.date,
    required this.status,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      id: json['id'],
      studentId: json['student_id'],
      date: json['date'],
      status: json['status'],
    );
  }
}

class AttendanceSummaryRecord {
  final int userId;
  final String? admissionId;
  final String firstName;
  final String lastName;
  final String? className;
  final String? section;
  final int totalPresent;
  final int totalAbsent;
  final int totalLate;
  
  // Computed property
  double get percentage {
    int total = totalPresent + totalAbsent + totalLate;
    return total > 0 ? (totalPresent / total) * 100 : 0.0;
  }

  AttendanceSummaryRecord({
    required this.userId,
    this.admissionId,
    required this.firstName,
    required this.lastName,
    this.className,
    this.section,
    required this.totalPresent,
    required this.totalAbsent,
    required this.totalLate,
  });

  factory AttendanceSummaryRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceSummaryRecord(
      userId: json['user_id'],
      admissionId: json['admission_id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      className: json['class_name'],
      section: json['section'],
      totalPresent: json['total_present'] ?? 0,
      totalAbsent: json['total_absent'] ?? 0,
      totalLate: json['total_late'] ?? 0,
    );
  }
}
