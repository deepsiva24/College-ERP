class FeeRecord {
  final int id;
  final int studentId;
  final String term;
  final double amountDue;
  final double amountPaid;
  final String status;
  final String? dueDate;

  FeeRecord({
    required this.id,
    required this.studentId,
    required this.term,
    required this.amountDue,
    required this.amountPaid,
    required this.status,
    this.dueDate,
  });

  factory FeeRecord.fromJson(Map<String, dynamic> json) {
    return FeeRecord(
      id: json['id'],
      studentId: json['student_id'],
      term: json['term'],
      amountDue: (json['amount_due'] as num).toDouble(),
      amountPaid: (json['amount_paid'] as num).toDouble(),
      status: json['status'],
      dueDate: json['due_date'],
    );
  }
}

class ClassFeeSummary {
  final String className;
  final double totalDue;
  final double totalPaid;
  final int studentCount;

  ClassFeeSummary({
    required this.className,
    required this.totalDue,
    required this.totalPaid,
    required this.studentCount,
  });

  factory ClassFeeSummary.fromJson(Map<String, dynamic> json) {
    return ClassFeeSummary(
      className: json['class_name'],
      totalDue: (json['total_due'] as num).toDouble(),
      totalPaid: (json['total_paid'] as num).toDouble(),
      studentCount: json['student_count'],
    );
  }
}

class StudentFeeDetail {
  final int userId;
  final String firstName;
  final String lastName;
  final String? admissionId;
  final List<FeeRecord> fees;

  StudentFeeDetail({
    required this.userId,
    required this.firstName,
    required this.lastName,
    this.admissionId,
    required this.fees,
  });

  factory StudentFeeDetail.fromJson(Map<String, dynamic> json) {
    return StudentFeeDetail(
      userId: json['user_id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      admissionId: json['admission_id'],
      fees: (json['fees'] as List).map((f) => FeeRecord.fromJson(f)).toList(),
    );
  }
}
