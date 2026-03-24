// lib/models/record_attendance.dart

class ClassSectionInfo {
  final String className;
  final String section;

  ClassSectionInfo({
    required this.className,
    required this.section,
  });

  factory ClassSectionInfo.fromJson(Map<String, dynamic> json) {
    return ClassSectionInfo(
      className: json['class_name'] ?? '',
      section: json['section'] ?? 'A',
    );
  }
}

class StudentBasic {
  final int userId;
  final String? admissionId;
  final String firstName;
  final String lastName;

  StudentBasic({
    required this.userId,
    this.admissionId,
    required this.firstName,
    required this.lastName,
  });

  factory StudentBasic.fromJson(Map<String, dynamic> json) {
    return StudentBasic(
      userId: json['user_id'],
      admissionId: json['admission_id'],
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
    );
  }
}

class BulkUploadResult {
  final int added;
  final int updated;
  final List<String> errors;

  BulkUploadResult({
    required this.added,
    required this.updated,
    required this.errors,
  });

  factory BulkUploadResult.fromJson(Map<String, dynamic> json) {
    return BulkUploadResult(
      added: json['records_added'] ?? 0,
      updated: json['records_updated'] ?? 0,
      errors: List<String>.from(json['errors'] ?? []),
    );
  }
}
